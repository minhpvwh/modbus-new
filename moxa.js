require('dotenv').config();

const {getAPI} = require('./modules/callAPI');

let workerThreads = {};
const api = process.env.API_GET_METER;

async function createWorkerThread() {
    const meters = await getAPI(api);
    if (meters) {
        meters.data.forEach(function (data, index) {
            if (!workerThreads[`thread-${data.id}`]) {
                const worker = new Worker('./worker.js');
                workerThreads[`thread-${data.id}`] = worker;
                // Receive messages from the worker thread
                worker.once('message', (message) => {
                    console.log(message + ' received from the worker thread!');
                });
                // Send a ping message to the spawned worker thread
                worker.postMessage(data);
            } else {
                workerThreads[`thread-${data.id}`].postMessage(data);
            }
        })
    }
}
createWorkerThread();
setInterval(createWorkerThread, process.env.TIME_UPDATE_METERS);