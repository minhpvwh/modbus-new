require('dotenv').config();

const ModbusRTU = require("modbus-serial");
const moment = require('moment-timezone');
const {
    Worker,
    isMainThread,
    parentPort
} = require('worker_threads');
const mysql = require('mysql');
const mongoDB = require('./modules/mongoDB');
mongoDB.connectDB();
const Meter = require('./models/meterModel');
const constants = require('./utils/constants');
const Store = require('./store');
const client = new ModbusRTU();
const {postAPI} = require('./modules/callAPI');

let meter_data = {};
const apiLaravelEcho = 'http://laravel-echo-server:6001/apps/pmsa/events?auth_key=3b4072a490a7d9f60f6c12d0a761921e';

const raiseAlarm = async function (meter_id, meter_name, level, msg, param) {
    const canSendMessage = Store.push(meter_id, level, msg);
    if (canSendMessage) {
        try {
            await postAPI(apiLaravelEcho, {
                channel: "meter",
                name: "notification",
                data: {
                    meter_name: meter_name,
                    message: meter_name + " " + constants.codeMessages[msg],
                    update_at: moment().tz("Asia/Ho_Chi_Minh").format(),
                }
            });

            await postAPI('http://app/api/v1/send-alarm', {
                "meter_id": meter_id,
                "level": level,
                "email": 'haituan2589@gmail.com',
                "title": `[PMSA] Cảnh báo đồng hồ ${meter_name}`,
                "msg": constants.codeMessages[msg] || msg,
            })

        } catch (e) {
            console.log("Error on insert alarm" + e);
        }
    }
};

const getMetersValue = async (meters) => {
    try {
        // get value of all meters
        for (let meter of meters) {
            // output value to console
            try {
                await getMeterValue(meter);
            } catch (err) {
                console.log("[ERROR] await getMeterValue(meter)");
            }

            // wait 100ms before get another device
            await sleep(process.env.TIME_REQ);
        }
    } catch (e) {
        // if error, handle them here (it should not)
        console.log(e)
    } finally {
        // after get all data from salve repeate it again
        setTimeout(() => {
            getMetersValue(data.meters)
        }, 2000)
        // setImmediate(() => {
        //     getMetersValue(data.meters);
        // })
    }
};

const getMeterValue = async (id) => {
    try {
        // set ID of slave
        await client.setID(id.slave_id);

        meter_data['meter_id'] = id.id;
        meter_data['update_at'] = moment().tz("Asia/Ho_Chi_Minh").format();
        meter_data['timestamp'] = moment().tz("Asia/Ho_Chi_Minh").toDate().getTime();

        for (const param of id.param) {
            if (param.type === 'inputRegister') {
                let val = await client.readInputRegisters(param.address, 2);
                meter_data[param.description] = Number.isNaN(val.buffer.readFloatBE()) ? 0 : val.buffer.readFloatBE();
            }
            if (param.type === 'holdingRegister') {
                if (param.address === 801) {
                    let val = await client.readHoldingRegisters(param.address, 4);
                    meter_data[param.description] = Number.isNaN(val.buffer.readDoubleBE()) ? 0 : val.buffer.readDoubleBE() / 1000;
                } else {
                    let val = await client.readHoldingRegisters(param.address, 2);
                    meter_data[param.description] = Number.isNaN(val.buffer.readFloatBE()) ? 0 : val.buffer.readFloatBE();
                }

            }
        }

        switch (meter_data) {
            case (meter_data.i1 == 0 || meter_data.i2 == 0 || meter_data.i3 == 0):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR01', 'i');
                break;
            case (meter_data.v1n == 0 || meter_data.v2n == 0 || meter_data.v3n == 0 || meter_data.v12 == 0 || meter_data.v23 == 0 || meter_data.v31 == 0):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR02', 'vll');
                break;
            case ((meter_data.v1n < 60 && meter_data.v2n !== 0 && meter_data.v3n !== 0) ||
                (meter_data.v1n !== 0 && meter_data.v2n < 60 && meter_data.v3n !== 0) ||
                (meter_data.v1n !== 0 && meter_data.v2n !== 0 && meter_data.v3n < 60)):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR03', 'vll');
                break;
            case ((meter_data.v1n < 60 && meter_data.v2n < 60 && meter_data.v3n !== 0) ||
                (meter_data.v1n !== 0 && meter_data.v2n < 60 && meter_data.v3n < 60) ||
                (meter_data.v1n < 60 && meter_data.v2n !== 0 && meter_data.v3n < 60)):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR04', 'vll');
                break;
            case (((Math.abs(meter_data.i1 - meter_data.i2) / meter_data.i1) * 100 >= 15) ||
                ((Math.abs(meter_data.i2 - meter_data.i3) / meter_data.i2) * 100 >= 15) ||
                ((Math.abs(meter_data.i1 - meter_data.i3) / meter_data.i1) * 100 >= 15)):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR05', 'i');
                break;
            case (((Math.abs(meter_data.kw1 - meter_data.kw2) / meter_data.kw1) * 100 >= 15) ||
                ((Math.abs(meter_data.kw2 - meter_data.kw3) / meter_data.kw2) * 100 >= 15) ||
                ((Math.abs(meter_data.kw1 - meter_data.kw3) / meter_data.kw1) * 100 >= 15)):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR06', 'kw');
                break;
            case (((Math.abs(meter_data.v1n - meter_data.v2n) / meter_data.v1n) * 100 >= 15) ||
                ((Math.abs(meter_data.v2n - meter_data.v3n) / meter_data.v2n) * 100 >= 15) ||
                ((Math.abs(meter_data.v1n - meter_data.v3n) / meter_data.v1n) * 100 >= 15)):
                raiseAlarm(id.id, id.name, 'warning', 'ERROR07', 'vll');
                break;
            default:
                break;
        }

        await postAPI('http://app/api/v1/meter-data', meter_data);

        await postAPI(apiLaravelEcho, {
            channel: "meter",
            name: "id-" + id.id,
            data: meter_data
        });

        await postAPI(apiLaravelEcho, {
            channel: "meter",
            name: "status-id-" + id.id,
            data: {
                status: "Online"
            }
        });

    } catch (e) {
        raiseAlarm(id.id, id.name, 'danger', e.message, 'status');

        await postAPI(apiLaravelEcho, {
            channel: "meter",
            name: "status-id-" + id.id,
            data: {
                status: "Offline"
            }
        });
    }
};

parentPort.once('message', (data) => {
    try {
        client.connectTCP(data.ip, {
            port: data.port
        });
        client.setTimeout(1000);
        console.log("Connect Gateway OK");

    } catch (e) {
        console.log("Can not connect gateway");
    }

    getMetersValue(data.meters);
});