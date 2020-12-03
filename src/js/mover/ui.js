// Copyright (c) 2020 Jarret Dyrbye
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php

const DomUtl = require('../ui/domutl.js').DomUtl;
const DownstreamStatusUi = require(
    '../ui/downstream_status.js').DownstreamStatusUi;

const moneysocket = require("moneysocket");
const Wad = moneysocket.Wad;

const MODES = new Set(["MAIN",
                       "DISCONNECTED",
                      ]);

class MoverUi {
    constructor(div, app) {
        this.parent_div = div;
        this.app = app;
        this.my_div = null;

        this.consumer1_ui = null;
        this.consumer2_ui = null;

        this.consumer1_wad = null;
        this.consumer2_wad = null;

        this.balance1_div = null;
        this.balance2_div = null;
        this.status_div = null;

        this.input1 = null;
        this.input2 = null;

        this.inputval1 = "1.0";
        this.inputval2 = "1.0";
    }

    draw(style) {
        this.my_div = document.createElement("div");
        this.my_div.setAttribute("class", style);

        this.display_div = DomUtl.emptyDiv(this.my_div);
        this.display_div.setAttribute("class", "app-mode-output");

        DomUtl.drawBr(this.my_div);

        this.consumer1_ui = new DownstreamStatusUi(this.my_div, "Wallet 1");
        this.consumer1_ui.draw("downstream-status-left");

        this.consumer2_ui = new DownstreamStatusUi(this.my_div, "Wallet 2");
        this.consumer2_ui.draw("downstream-status-left");

        this.switchMode("DISCONNECTED");

        this.parent_div.appendChild(this.my_div);
    }

    drawBalance(div, label, wad) {
        var d = DomUtl.emptyDiv(div);
        //var l = DomUtl.emptyDiv(d);
        var r = DomUtl.emptyDiv(d);

        var b = DomUtl.drawBigWad(r, wad);

        b.setAttribute('style', "padding:2px 2px 2px 2px;");
        d.setAttribute("style", "display: table;margin: 0 auto;" +
                       "position:relative");
        return d;
    }

    postStatus(errstr) {
        DomUtl.drawText(this.status_div, errstr);
    }

    drawAmountInput(div, defaultText) {
        var d = document.createElement("div");
        var i = document.createElement("input");
        i.setAttribute("type", "text");
        i.setAttribute("size", "5");
        i.setAttribute("value", defaultText);
        d.appendChild(i);
        div.appendChild(d);
        return [d, i];
    }

    wadHasUnits(wad, units) {
        console.log(wad.toString() + " is stable: " + wad.asset_stable +
                    " wad units: " + wad.asset_units);
        if (wad.asset_stable) {
            //console.log("wad: " + (wad.msats / 1000.0));
            //console.log("units: " + units);
            //console.log("result: " + (units <= (wad.msats / 1000.0)));
            return units <= wad.asset_units;
        }
        return (units * 1000) <= wad.msats;
    }

    msatAmount(wad, units) {
        console.log("wad: " + wad.toString() + " units: " + units);
        console.assert(this.wadHasUnits(wad, units));
        if (wad.asset_stable) {
            var fraction = units / wad.asset_units;
            return Math.round(wad.msats * fraction);
        }
        return units * 1000;
    }

    ///////////////////////////////

    sell1() {
        var v = this.input1.value;
        var units = parseFloat(v);
        if (isNaN(units)) {
            this.postStatus("couldn't parse: " + v);
            return;
        }
        console.log("top sell: " + units + " " + v);
        this.inputval1 = v;
        if (! this.wadHasUnits(this.consumer1_wad, units)) {
            this.postStatus("doesn't have " + units + " available");
            return;
        }
        this.app.send1to2(this.msatAmount(this.consumer1_wad, units));
    }

    sell2() {
        var v = this.input2.value;
        var units = parseFloat(v);
        if (isNaN(units)) {
            this.postStatus("couldn't parse: " + v);
            return;
        }
        console.log("bottom sell: " + units + " " + v);
        this.inputval2 = v;
        if (! this.wadHasUnits(this.consumer2_wad, units)) {
            this.postStatus("doesn't have " + units + " available");
            return;
        }
        this.app.send2to1(this.msatAmount(this.consumer2_wad, units));
    }

    ///////////////////////////////

    buy1() {
        var v = this.input1.value;
        var units = parseFloat(v);
        if (isNaN(units)) {
            this.postStatus("couldn't parse: " + v);
            return;
        }
        this.inputval1 = v;
        console.log("top buy: " + units + " " + v);

        var buy_msats = this.msatAmount(this.consumer1_wad, units);
        if (buy_msats > this.consumer2_wad.msats) {
            this.postStatus("counterparty doesn't have " + buy_msats +
                            " sats available");
            return;
        }
        this.app.send2to1(buy_msats);
    }

    buy2() {
        var v = this.input2.value;
        var units = parseFloat(v);
        if (isNaN(units)) {
            this.postStatus("couldn't parse: " + v);
            return;
        }
        console.log("bottom buy: " + units + " " + v);
        this.inputval2 = v;
        var buy_msats = this.msatAmount(this.consumer2_wad, units);
        if (buy_msats > this.consumer1_wad.msats) {
            this.postStatus("counterparty doesn't have " + buy_msats +
                            " sats available");
            return;
        }
        this.app.send1to2(buy_msats);
    }

    ///////////////////////////////

    drawUi1(div, symbol) {
        var d = DomUtl.emptyDiv(div);
        var b1 = DomUtl.drawButton(d, "Buy " + symbol + "  🠕",
            (function() {
                this.buy1();
            }).bind(this));
        b1.setAttribute("style", "float:left;");
        var [id, i] = this.drawAmountInput(d, this.inputval1);
        id.setAttribute("style", "float:left;");
        this.input1 = i;
        var b2 = DomUtl.drawButton(d, "Sell " + symbol + " 🠗",
            (function() {
                this.sell1();
            }).bind(this));
        b2.setAttribute("style", "float:left;");
        d.setAttribute("style",
            "padding-bottom:5px;display:table;" +
            "margin: 0 auto;position:relative");
        return d;
    }

    drawUi2(div, symbol) {
        var d = DomUtl.emptyDiv(div);
        var b1 = DomUtl.drawButton(d, "Sell " + symbol + " 🠕",
            (function() {
                this.sell2();
            }).bind(this));
        b1.setAttribute("style", "float:left;");
        var [id, i] = this.drawAmountInput(d, this.inputval2);
        id.setAttribute("style", "float:left;");
        this.input2 = i;
        var b2 = DomUtl.drawButton(d, "Buy " + symbol + "  🠗",
            (function() {
                this.buy2();
            }).bind(this));
        b2.setAttribute("style", "float:left;");
        d.setAttribute("style",
            "padding-top:5px;display:table;margin: 0 auto;position:relative");
        return d;
    }


    switchMode(new_mode) {
        console.assert(MODES.has(new_mode));
        this.mode = new_mode;
        DomUtl.deleteChildren(this.display_div);

        if (new_mode == "DISCONNECTED") {
            var t = DomUtl.drawText(
                this.display_div,
                "Please connect two moneysocket wallet providers.");
            t.setAttribute("style", "font-size:120%");

        } else if (new_mode == "MAIN") {
            //this.display_div.setAttribute("style", "padding:5px 0;");
            this.balance1_div = DomUtl.emptyDiv(this.display_div);
            this.drawBalance(this.balance1_div, "Wallet 1",
                             this.consumer1_wad);
            //DomUtl.drawBr(this.balance1_div);
            this.drawUi1(this.balance1_div, this.consumer1_wad.symbol);
            var style1 = ("background-color:#ff9fa2" +
                         ";padding:5px;border-radius:5px;" +
                         "border: 2px solid black");
            this.balance1_div.setAttribute("style", style1);


            this.status_div = DomUtl.emptyDiv(this.display_div);
            //DomUtl.drawBr(this.display_div);
            //var t = DomUtl.drawText(this.display_div, "~~~~");
            //t.setAttribute("style", "float:center;");

            DomUtl.drawBr(this.display_div);

            this.balance2_div = DomUtl.emptyDiv(this.display_div);
            this.drawUi2(this.balance2_div, this.consumer2_wad.symbol);
            //DomUtl.drawBr(this.balance2_div);
            this.drawBalance(this.balance2_div, "Wallet 2", this.consumer2_wad);
            var style2 = ("background-color:#b2c6ff" +
                          ";padding:5px;border-radius:5px;" +
                          "border: 2px solid black");
            this.balance2_div.setAttribute("style", style2);
        }
    }

    bothAreConnected() {
        return (this.consumer1_wad != null) && (this.consumer2_wad != null);
    }

    ////////

    consumer1Online() {
        console.log("consumer 1 is now online");
        this.consumer1_ui.updateConnected();
    }

    consumer1Offline() {
        console.log("consumer 1 is now offline");
        this.consumer1_wad = null;
        this.consumer1_ui.updateDisconnected();
        this.switchMode("DISCONNECTED");
    }

    consumer1WadUpdate(wad) {
        console.log("balance 1 update " + wad['msats'])
        this.consumer1_ui.updateProviderWad(wad);
        this.consumer1_wad = wad;

        if (this.bothAreConnected()) {
            this.switchMode("MAIN");
        } else {
            this.switchMode("DISCONNECTED");
        }
    }

    consumer1PingUpdate(msecs) {
        this.consumer1_ui.updatePingTime(msecs);
    }

    ////////

    consumer2Online() {
        console.log("consumer 2 is now online");
        this.consumer2_ui.updateConnected();
    }

    consumer2Offline() {
        console.log("consumer 2 is now offline");
        this.consumer2_wad = null;
        this.consumer2_ui.updateDisconnected();
        this.switchMode("DISCONNECTED");
    }

    consumer2WadUpdate(wad) {
        console.log("balance 2 update " + wad['msats'])
        this.consumer2_ui.updateProviderWad(wad);
        this.consumer2_wad = wad;
        if (this.bothAreConnected()) {
            this.switchMode("MAIN");
        } else {
            this.switchMode("DISCONNECTED");
        }
    }

    consumer2PingUpdate(msecs) {
        this.consumer2_ui.updatePingTime(msecs);
    }
}

exports.MoverUi = MoverUi;
