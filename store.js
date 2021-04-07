const _ = require('lodash');
class Store {
    static messageAlarm = {};

    static push(meter_id, level, msg) {
        if (!Store.messageAlarm[meter_id]) {
            if (level === 'warning') {
                Store.messageAlarm[meter_id] = {level: level, msg: msg}
            } else {
                Store.messageAlarm[meter_id] = {level: level}
            }
            return true;
        }

        if (level === 'warning') {
            if (!_.isEqual(Store.messageAlarm[meter_id], {level: level, msg: msg})) {
                Store.messageAlarm[meter_id] = {level: level, msg: msg};
                return true;
            }
        } else {
            if (!_.isEqual(Store.messageAlarm[meter_id], {level: level})) {
                Store.messageAlarm[meter_id] = {level: level};
                return true;
            }
        }
        return false;
    }

}

module.exports = Store;