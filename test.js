require('dotenv').config();


async function createWorkerThread() {
    console.log(123456)
}
createWorkerThread();
setInterval(createWorkerThread, 5000);