module.exports = function (callback, timeoutInMs) {
    let timeout = null;
    let finish = false;

    function refresh(cancel) {
        if (timeout) {
            clearTimeout(timeout);
        }

        if (finish) {
            console.warn("timeout already finished");
            return;
        }

        if (cancel) {
            return;
        }

        timeout = setTimeout(() => {
            finish = true;
            callback();
        }, timeoutInMs)
    }

    refresh();
    return refresh;
}