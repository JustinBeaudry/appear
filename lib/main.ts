type VoidFn = () => void
type ElFn = (el: Element, entry: IntersectionObserverEntry) => void
type El = Element | Element[] | HTMLCollection

enum AppearState {
	"IDLE" = "idle",
	"OBSERVING" = "observing",
	"PAUSED" = "paused",
	"DESTROYED" = "destroyed"
}

export class Appear {
	/**
	 *
	 * @param elements - elements to activate interaction observation on
	 * @param root - the container to observe. defaults to the viewport
	 * @param init - called before appear starts observing
	 * @param appear - called when an element can be observed
	 * @param disappear - called when an element can no longer be observed
	 * @param done - called when appear has stopped and is no longer observing
	 * @param reappear - if true, will continue to watch the element for observations
	 * @param bounds - pixel or percentage margin around the root container
	 * @param thresholdSize - fidelity of observation, i.e. the size of the threshold array, defaults to 20
	 * @param thresholdTrigger - at what threshold determines if an element has appeared or disappeared
	 */
	constructor(
		private readonly elements:  El | (() => El),
		private readonly root?: Element,
		private readonly init?: VoidFn,
		private readonly appear?: ElFn,
		private readonly disappear?: ElFn,
		private readonly done?: VoidFn,
		private readonly reappear = true,
		private readonly bounds = "0px",
		private readonly thresholdSize: number = 20,
		private readonly thresholdTrigger: number = 0.85
	) {
		if (!elements) {
			throw new Error('Appear must be constructed with elements')
		}
		// event handler functions lose their "this" binding
		document.addEventListener('DOMContentLoaded', () => this.onLoad())
	}
	/**
	 * Pauses observations, i.e. removes the listeners, and sets the state to 'paused'
	 * @void
	 */
	pause() {
		if (this.isActive()) return
		this.state = AppearState.PAUSED
		this.observer?.disconnect()
	}
	/**
	 * Resumes observations, i.e. reattaches listeners and sets the state to 'observing'.
	 * If the state is 'destroyed', this will create a new InteractionObserver instance and
	 * configure the supplied elements for observation.
	 * @void
	 */
	resume() {
		if (!this.isActive()) return
		if (this.state === AppearState.DESTROYED) {
			this.onLoad()
			return
		}
		this.handleTracking()
	}
	/**
	 * Stops all observations by disconnecting and removing the observer
	 * @void
	 */
	destroy() {
		this.observer?.disconnect()
		this.observer = undefined
		this.state = AppearState.DESTROYED
		if (typeof this.done === 'function') this.done()
	}

	private observer?: IntersectionObserver
	private state: AppearState = AppearState.IDLE
	private isActive() {
		return this.state !== AppearState.PAUSED && this.state !== AppearState.DESTROYED
	}
	private interactionObserverCallback(entries: IntersectionObserverEntry[]) {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				if (entry.intersectionRatio >= this.thresholdTrigger) {
					if (typeof this.appear === 'function') this.appear(entry.target, entry)
					// if this is a singleton observation, remove the target from the observer
					if (!this.reappear) this.observer?.unobserve(entry.target)
				}
			} else {
				if (typeof this.disappear === 'function') this.disappear(entry.target, entry)
			}
		}
	}
	private onLoad() {
		if (typeof this.init === 'function') this.init()
		const options: IntersectionObserverInit = {
			rootMargin: this.bounds,
			threshold: this.buildThreshold()
		}
		if (this.root instanceof Element) options.root = this.root
		this.observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => this.interactionObserverCallback(entries), options)
		this.handleTracking()
	}
	private buildThreshold() {
		let thresholds: number[] = []

		for (let i = 0; i <= this.thresholdSize; i++) {
			let ratio = i / this.thresholdSize
			thresholds.push(ratio)
		}
		thresholds.push(0)
		return thresholds
	}
	private handleTracking() {
		let elements: Element[]
		if (typeof this.elements === 'function') elements = this.elements() as Element[]
		else if (!Array.isArray(this.elements)) elements = [this.elements as Element]
		else elements = []
		for (const target of elements) {
			this.observer?.observe(target)
		}
		this.state = AppearState.OBSERVING
	}
}

export default function appear({
	elements,
	root,
	init,
	appear,
	disappear,
	done,
	reappear,
	bounds,
	thresholdSize,
	thresholdTrigger
}: ConstructorParameters<typeof Appear>) {
	return new Appear(elements, root, init, appear, disappear, done, reappear, bounds, thresholdSize, thresholdTrigger)
}
