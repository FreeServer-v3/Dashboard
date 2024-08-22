const { EventEmitter } = require('events');

// 設置最大事件監聽器數量
EventEmitter.defaultMaxListeners = 100;

// 自定義事件類
class Event extends EventEmitter {
	constructor() {
		super();
	}
}

// 實例化事件總線
const eventBus = new Event();

module.exports = {
	emitter: Event,
	eventBus: eventBus
};
