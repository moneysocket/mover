// Copyright (c) 2020 Jarret Dyrbye
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const moneysocket = require('moneysocket');

const Uuid = moneysocket.Uuid;
const Bolt11 = moneysocket.Bolt11;
const ConsumerStack = moneysocket.ConsumerStack;
const ProviderStack = moneysocket.ProviderStack;
const Wad = moneysocket.Wad;

const DomUtl = require('./ui/domutl.js').DomUtl;
const ConnectUi = require('./ui/connect.js').ConnectUi;
const MoverUi = require("./mover/ui.js").MoverUi;

///////////////////////////////////////////////////////////////////////////////

class MoverApp {
    constructor() {
        this.parent_div = document.getElementById("ui");
        this.my_div = DomUtl.emptyDiv(this.parent_div);

        this.mover_ui = new MoverUi(this.my_div, this);

        this.consumer1_stack = this.setupConsumer1Stack();
        this.consumer2_stack = this.setupConsumer2Stack();

        this.consumer1_ui = new ConnectUi(this.my_div, "Moneysocket Wallet 1",
                                          this.consumer1_stack);
        this.consumer2_ui = new ConnectUi(this.my_div, "Moneysocket Wallet 2",
                                          this.consumer2_stack);

        this.downstream_info = {'ready': false};
        this.upstream_info = {'ready': false};
        this.account_uuid = Uuid.uuidv4();
        this.requests_from_provider = new Set();
        this.invoice_requests = {};
    }

    setupConsumer1Stack() {
        var s = new ConsumerStack();
        s.onannounce = (function(nexus) {
            this.consumer1OnAnnounce(nexus);
        }).bind(this);
        s.onrevoke = (function(nexus) {
            this.consumer1OnRevoke(nexus);
        }).bind(this);
        s.onproviderinfo = (function(provider_info) {
            this.consumer1OnProviderInfo(provider_info);
        }).bind(this);
        s.onstackevent = (function(layer_name, nexus, status) {
            this.consumer1OnStackEvent(layer_name, nexus, status);
        }).bind(this);
        s.onping = (function(msecs) {
            this.consumer1OnPing(msecs);
        }).bind(this);
        s.oninvoice = (function(bolt11, request_reference_uuid) {
            this.consumer1OnInvoice(bolt11, request_reference_uuid);
        }).bind(this);
        s.onpreimage = (function(preimage, request_reference_uuid) {
            this.consumer1OnPreimage(preimage, request_reference_uuid);
        }).bind(this);
        s.onerror = (function(error_msg, request_reference_uuid) {
            this.consumer1OnError(error_msg, request_reference_uuid);
        }).bind(this);
        return s;
    }

    setupConsumer2Stack() {
        var s = new ConsumerStack();
        s.onannounce = (function(nexus) {
            this.consumer2OnAnnounce(nexus);
        }).bind(this);
        s.onrevoke = (function(nexus) {
            this.consumer2OnRevoke(nexus);
        }).bind(this);
        s.onproviderinfo = (function(provider_info) {
            this.consumer2OnProviderInfo(provider_info);
        }).bind(this);
        s.onstackevent = (function(layer_name, nexus, status) {
            this.consumer2OnStackEvent(layer_name, nexus, status);
        }).bind(this);
        s.onping = (function(msecs) {
            this.consumer2OnPing(msecs);
        }).bind(this);
        s.oninvoice = (function(bolt11, request_reference_uuid) {
            this.consumer2OnInvoice(bolt11, request_reference_uuid);
        }).bind(this);
        s.onpreimage = (function(preimage, request_reference_uuid) {
            this.consumer2OnPreimage(preimage, request_reference_uuid);
        }).bind(this);
        s.onerror = (function(error_msg, request_reference_uuid) {
            this.consumer2OnError(error_msg, request_reference_uuid);
        }).bind(this);
        return s;
    }

    drawMoverAppUi() {
        this.my_div.setAttribute("class", "bordered");
        DomUtl.drawImg(this.my_div, "img/animation.gif");
        var t = DomUtl.drawText(this.my_div, "Moon Money Mover 3000 🚀");
        t.setAttribute("class", "blink");
        DomUtl.drawText(this.my_div, "=========================");
        DomUtl.drawBr(this.my_div);
        this.mover_ui.draw("center");
        DomUtl.drawBr(this.my_div);
        this.consumer1_ui.draw("left");
        this.consumer2_ui.draw("right");
        DomUtl.drawBr(this.my_div);
        DomUtl.drawBr(this.my_div);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Consumer 1 Stack Callbacks
    ///////////////////////////////////////////////////////////////////////////

    consumer1OnAnnounce(nexus) {
        this.mover_ui.consumer1Online();
    }

    consumer1OnRevoke(nexus) {
        this.mover_ui.consumer1Offline();
    }

    consumer1OnStackEvent(layer_name, nexus, status) {
        this.consumer1_ui.postStackEvent(layer_name, status);
    }

    consumer1OnProviderInfo(provider_info) {
        this.mover_ui.consumer1WadUpdate(provider_info['wad']);
    }

    consumer1OnPing(msecs) {
        this.mover_ui.consumer1PingUpdate(msecs);
    }

    consumer1OnInvoice(bolt11, request_reference_uuid) {
        if (! request_reference_uuid in this.invoice_requests) {
            console.log("got unrequested invoice? " + request_reference_uuid);
        }
        // TODO check msats
        delete this.invoice_requests[request_reference_uuid];
        this.consumer2_stack.requestPay(bolt11);
    }

    consumer1OnPreimage(preimage, request_reference_uuid) {
        console.log("got preimage from 1: " + preimage);
    }

    consumer1OnError(error_msg, request_reference_uuid) {
        console.log("got error from 1: " + error_msg);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Consumer 2 Stack Callbacks
    ///////////////////////////////////////////////////////////////////////////

    consumer2OnAnnounce(nexus) {
        this.mover_ui.consumer2Online();
    }

    consumer2OnRevoke(nexus) {
        this.mover_ui.consumer2Offline();
    }

    consumer2OnStackEvent(layer_name, nexus, status) {
        this.consumer2_ui.postStackEvent(layer_name, status);
    }

    consumer2OnProviderInfo(provider_info) {
        this.mover_ui.consumer2WadUpdate(provider_info['wad']);
    }

    consumer2OnPing(msecs) {
        this.mover_ui.consumer2PingUpdate(msecs);
    }

    consumer2OnInvoice(bolt11, request_reference_uuid) {
        if (! request_reference_uuid in this.invoice_requests) {
            console.log("got unrequested invoice? " + request_reference_uuid);
        }
        // TODO check msats
        delete this.invoice_requests[request_reference_uuid];
        this.consumer1_stack.requestPay(bolt11);
    }

    consumer2OnPreimage(preimage, request_reference_uuid) {
        console.log("got preimage from 2: " + preimage);
    }

    consumer2OnError(error_msg, request_reference_uuid) {
        console.log("got error from 2: " + error_msg);
    }

    ///////////////////////////////////////////////////////////////////////////
    // UI calls
    ///////////////////////////////////////////////////////////////////////////

    send1to2(msats) {
        console.log
        var uuid = Uuid.uuidv4();
        this.invoice_requests[uuid] = msats;
        console.log("req msats: " + msats);
        this.consumer2_stack.requestInvoice(msats, uuid, null);
    }

    send2to1(msats) {
        var uuid = Uuid.uuidv4();
        this.invoice_requests[uuid] = msats;
        console.log("req msats: " + msats);
        this.consumer1_stack.requestInvoice(msats, uuid, null);
    }
}

window.app = new MoverApp();


function drawFirstUi() {
    window.app.drawMoverAppUi()

}

window.addEventListener("load", drawFirstUi());
