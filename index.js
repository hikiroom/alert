const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8000;

app.use(express.static('public'));
server.listen(port, () => {
    console.log(`server listening. port: ${port}`)
});

const globalAlertList = [];
/**
 * ユーザーIDをもとにglobalAlertList内にあるalertWrap[]を取得する
 * @param {string} userId
 * @return {array} alertWrap[]
 */
const getAlertWrapByUserId = (userId) => {
    return globalAlertList.filter((alertWrap) => alertWrap.userId === userId);
};
/**
 * アラートIDをもとにglobalAlertList内にあるalertWrapを取得する
 * @param {string} alertId
 * @return {object} alertWrap
 */
const getAlertWrapByAlertId = (alertId) => {
    return globalAlertList.find((alertWrap) => alertWrap.alert.id === alertId);
};
/**
 * アラートIDをもとにglobalAlertList内にあるalertWrapのindexを取得する
 * @param {string} alertId
 * @return {number} index
 */
const getAlertWrapIdxByAlertId = (alertId) => {
    return globalAlertList.findIndex((alertWrap) => alertWrap.alert.id === alertId);
};
/**
 * IDを生成する
 * @param {string} prefix
 * @return {string}
 */
const getId = (prefix = '') => {
    const nowTime = new Date().getTime().toString(16);
    const randomNum = Math.trunc(Math.random() * 1000).toString(16);

    return prefix + nowTime + randomNum;
}

io.on('connection', (socket) => {
    const createUserId = () => {
        const userId = getId('user-');
    
        socket._userId = userId;
        socket.emit('userIdRequest', userId);
    };
    const createAlert = (userId, alertName) => {
        const alertId = getId();
        const alert = {
            id: alertId,
            state: false,
            name: alertName,
        };
        const alertWrap = {
            userId,
            alert
        };
    
        globalAlertList.push(alertWrap);
        socket.join(alertId);
        socket.emit('createAlertRequest', alert);
    };
    const deleteAlert = (alertId, isMyAlert) => {
        const alertWrapIdx = getAlertWrapIdxByAlertId(alertId);

        if (isMyAlert) {
            globalAlertList.splice(alertWrapIdx, 1);
            io.to(alertId).emit('deleteAlertRequest', alertId, isMyAlert);
            io.sockets.in(alertId).clients((error, clients) => {
                if (error) {
                    throw error
                };
    
                clients.forEach((clientId) => {
                    io.sockets.sockets[clientId].leave(alertId);
                });
            });
        } else {
            socket.emit('deleteAlertRequest', alertId, isMyAlert);
        }
    }
    const getSomeonesAlert = (alertId, formId) => {
        const alertWrap = getAlertWrapByAlertId(alertId);
    
        if (alertWrap) {
            socket.join(alertId);
            socket.emit('getSomeonesAlertRequest', alertWrap.alert, formId);
        } else {
            socket.emit('getSomeonesAlertRequest', {}, formId);
        }
    };
    const setAlertState = (alertId, alertState) => {
        const alertWrap = getAlertWrapByAlertId(alertId);
    
        if (alertWrap) {
            alertWrap.alert.state = alertState;
            io.to(alertWrap.alert.id).emit('setAlertStateRequest', alertId, alertState);
        }
    };
    const disconnect = (reason) => {
        if (reason === 'transport close') {
            const alertWraps = getAlertWrapByUserId(socket._userId);
    
            alertWraps.forEach((alertWrap) => {
                const alertId = alertWrap.alert.id;
    
                deleteAlert(alertId, true);
            });
        }
    }
    const reconnect = (userId, alertIdArr) => {
        socket._userId = userId;
        alertIdArr.forEach((alertId) => {
            socket.join(alertId);
        });
    }

    socket.on('userIdRequest', createUserId);
    socket.on('createAlertRequest', createAlert);
    socket.on('deleteAlertRequest', deleteAlert);
    socket.on('getSomeonesAlertRequest', getSomeonesAlert);
    socket.on('setAlertStateRequest', setAlertState);
    socket.on('reconnectRequest', reconnect);
    socket.on('disconnect', disconnect);
});