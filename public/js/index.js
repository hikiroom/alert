(() => {
    'use strict';

    const socket = io();
    const store = {
        userId: '',
        myAlert: {
            instances: [],
            OUTPUT_EL: document.querySelector('#my-alert-list'),
            deleteAlert(alertId) {
                const targetIndex = this.instances.findIndex((alert) => alert.id === alertId);

                this.instances.splice(targetIndex, 1);
            },
            getAlert(alertId) {
                return this.instances.find((alert) => alert.id === alertId);
            },
        },
        watchingAlert: {
            instances: [],
            OUTPUT_EL: document.querySelector('#watching-alert-list'),
            deleteAlert(alertId) {
                const targetIndex = this.instances.findIndex((alert) => alert.id === alertId);

                this.instances.splice(targetIndex, 1);
            },
            getAlert(alertId) {
                return this.instances.find((alert) => alert.id === alertId);
            },
        },
        form: {
            instances: [],
            getForm(formId) {
                return this.instances.find((form) => form.id === formId);
            },
        },
        modal: {
            instances: [],
            getAnOpenModal() {
                return this.instances.find((modal) => modal.anOpen);
            },
        },
    };

    class Alert {
        constructor(name, state, id, isMyAlert = true) {
            this._tmpEl = document.querySelector('.js_alert');
            this._name = name;
            this._state = state;
            this._id = id;
            this._isMyAlert = isMyAlert;
            this._contentEl = null;
            this._nameEl = null;
            this._stateEl = null;
            this._idEl = null;
            this._toggleStateEl = null;
            this._deleteEl = null;
        }

        get id() {
            return this._id;
        }
        generateElement(outputEl) {
            const alert = document.importNode(this._tmpEl.content, true);
            this._contentEl = alert.querySelector('.js_alert__content');
            this._nameEl = alert.querySelector('.js_alert__name');
            this._stateEl = alert.querySelector('.js_alert__state');
            this._idEl = alert.querySelector('.js_alert__id');
            this._toggleStateEl = alert.querySelector('.js_alert__toggle-state');
            this._deleteEl = alert.querySelector('.js_alert__delete');
            this._contentEl.id = this._id + '_' + (Math.trunc(Math.random() * 10));

            if (this._isMyAlert) {
                this._toggleStateEl.addEventListener('click', this.setAlertStateRequest.bind(this));
            } else {
                this._toggleStateEl.remove();
            }

            this._deleteEl.addEventListener('click', this.deleteAlertRequest.bind(this));
            this._nameEl.insertAdjacentText('beforeend', this._name);
            this._stateEl.insertAdjacentText('beforeend', (this._state ? 'ON' : 'OFF'));
            this._idEl.insertAdjacentText('beforeend', this._id);
            outputEl.appendChild(alert);
        }
        setAlertStateRequest() {
            socket.emit('setAlertStateRequest', this._id, !this._state);
        }
        setState(alertState) {
            this._state = alertState;
            this._stateEl.innerText = (alertState ? 'ON' : 'OFF');
        }
        deleteAlertRequest() {
            socket.emit('deleteAlertRequest', this._id, this._isMyAlert);
        }
        deleteElement() {
            const parent = this._contentEl.parentElement;

            parent.removeChild(this._contentEl);

            if (!parent.children.length) {
                // 不要なtextNode（ホワイトスペースなど）の削除
                for (let len = parent.childNodes.length; len--;) {
                    parent.removeChild(parent.firstChild);
                }
            }
        }
    }

    class Form {
        constructor(form, i) {
            this._id = i;
            this._form = form;
            this._input = this._form.querySelector('.js_form__input');
            this._isInputErr = false;
            this._submitBtn = this._form.querySelector('.js_form__submit');
            this._submitType = this._submitBtn.dataset.submitType;
        }

        get id() {
            return this._id;
        }
        setEvent() {
            this._input.addEventListener('input', this.inputText.bind(this));
            this._submitBtn.addEventListener('click', this.submit.bind(this));
        }
        inputText(e) {
            const input = e.target;

            if (input.value !== '') {
                this._submitBtn.disabled = false;
            } else {
                this._submitBtn.disabled = true;
            }

            this.inputErr(false);
        }
        inputErr(boolean) {
            this._isInputErr = boolean;

            if (boolean) {
                this._input.classList.add('is_err');
            } else {
                this._input.classList.remove('is_err');
            }
        }
        submit() {
            if (this._submitType === 'add' && this._input.value !== '') {
                this.submitAddRequest();
            } else if (this._submitType === 'create' && this._input.value !== '') {
                this.submitCreateRequest();
            } else {
                this.inputErr(true);
            }
        }
        submitAddRequest() {
            const alertId = this._input.value;

            if (alertId !== '') {
                socket.emit('getSomeonesAlertRequest', alertId, this._id);
                this._input.value = '';
                this._submitBtn.disabled = true;
            } else {
                this.inputErr(true);
            }
        }
        submitCreateRequest() {
            const alertName = this._input.value;

            if (alertName !== '') {
                socket.emit('createAlertRequest', store.userId, alertName);
                this._input.value = '';
                this._submitBtn.disabled = true;
            } else {
                this.inputErr(true);
            }
        }
        static init() {
            const jsForm = document.querySelectorAll('.js_form');

            jsForm.forEach((target, i) => {
                const form = new Form(target, i);

                form.setEvent();
                store.form.instances.push(form);
            });
        }
    }
    Form.init();

    class Modal {
        constructor(triggerBtn) {
            this._triggerBtn = triggerBtn;
            this._targetModal = document.querySelector(triggerBtn.getAttribute('href'));
            this._closeBtn = this._targetModal.querySelector('.js_modal__close');
            this._anOpen = false;
        }

        get anOpen() {
            return this._anOpen;
        }
        setEvent() {
            this._triggerBtn.addEventListener('click', this.open.bind(this));
            this._closeBtn.addEventListener('click', this.close.bind(this));
        }
        open(e) {
            if (e) {
                e.preventDefault();
            }

            this._anOpen = true;
            this._targetModal.classList.add('is_active');
        }
        close(e) {
            if (e) {
                e.preventDefault();
            }

            this._anOpen = false;
            this._targetModal.classList.remove('is_active');
        }
        static init() {
            const jsModal = document.querySelectorAll('.js_modal');

            for (const target of jsModal) {
                const modal = new Modal(target);

                modal.setEvent();
                store.modal.instances.push(modal);
            }
        }
    }
    Modal.init();

    socket.on('createAlertRequest', (alert) => {
        const myAlert = new Alert(alert.name, alert.state, alert.id);
        const modal = store.modal.getAnOpenModal();

        myAlert.generateElement(store.myAlert.OUTPUT_EL);
        store.myAlert.instances.push(myAlert);

        if (modal) {
            modal.close();
        }
    });
    socket.on('getSomeonesAlertRequest', (alert, formId = -1) => {
        const existAlert = Object.keys(alert).length > 0;

        if (existAlert) {
            const someonesAlert = new Alert(alert.name, alert.state, alert.id, false);
            const modal = store.modal.getAnOpenModal();

            someonesAlert.generateElement(store.watchingAlert.OUTPUT_EL);
            store.watchingAlert.instances.push(someonesAlert);
            modal.close();
        } else {
            const form = store.form.getForm(formId);

            if (form) {
                form.inputErr(true);
            }
        }
    });
    socket.on('deleteAlertRequest', (alertId, isMyAlert) => {
        const myAlert = store.myAlert.getAlert(alertId);
        const watchingAlert = store.watchingAlert.getAlert(alertId);

        if (myAlert && isMyAlert) {
            myAlert.deleteElement();
            store.myAlert.deleteAlert(alertId);
        }
        if (watchingAlert) {
            watchingAlert.deleteElement();
            store.watchingAlert.deleteAlert(alertId);
        }
    });
    socket.on('setAlertStateRequest', (alertId, alertState) => {
        const myAlert = store.myAlert.getAlert(alertId);
        const watchingAlert = store.watchingAlert.getAlert(alertId);

        if (myAlert) {
            myAlert.setState(alertState);
        }
        if (watchingAlert) {
            watchingAlert.setState(alertState);
        }
    });
    socket.on('connect', () => {
        if (store.userId === '') {
            socket.emit('userIdRequest');
        }
    });
    socket.on('userIdRequest', (userId) => {
        store.userId = userId;
    });
    socket.on('reconnect', () => {
        const myAlertIds = store.myAlert.instances.map((myAlert) => myAlert.id);
        const watchingAlertIds = store.watchingAlert.instances.map((watchingAlert) => watchingAlert.id);
        const alertIds = myAlertIds.concat(watchingAlertIds);

        socket.emit('reconnectRequest', store.userId, alertIds);
    });
})();