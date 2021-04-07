const axios = require('axios');

const getAPI = async(url) => {
    try {
        const rs = await axios.get(url);
        if(typeof rs.data !== 'object') return false;
        return rs.data;
    } catch (error) {
        console.log("[ERROR] get API: ", error);
        return false
    }
}

const postAPI = async(url, data) => {
    try {
        await axios.post(url, data);
        return true
        // if(typeof rs.data !== 'object') return false;
        // return rs.data;
    } catch (error) {
        console.log("[ERROR] get API: ", error);
        return false
    }
}

module.exports = {
    getAPI,
    postAPI,
}