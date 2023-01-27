export var rawData = Array(37);
export var colNamesOld = ["Data", "Idx", "Tstamp", "Carga", "cs700",
    "Temp. Panel", "Trh1", "Trh2", "Irrad. Solar", "cs320_T",
    "cs320_X", "cs320_Y", "cs320_Z", "Nivel d'Agua", "HydrosT",
    "HydrosC", "Temp. 01", "Temp. 02", "Temp. 03", "Temp. 04",
    "Temp. 05", "Temp. 06", "Temp. 07", "Temp. 08", "Temp. 09",
    "Temp. 10", "Temp. 11", "Temp. 12", "Temp. 13", "Temp. 14",
    "Temp. 15", "Temp. 16", "Temp. 17", "Temp. 18", "Umid. 01",
    "Umid. 02", "Umid. 03"];

export var colNames = ["Data", "Idx", "Tstamp", "Carga", "cs700",
    "Temp. Panel", "Trh1", "Trh2", "Irrad. Solar", "cs320_T",
    "cs320_X", "cs320_Y", "cs320_Z", "Nivel d'Agua", "HydrosT",
    "HydrosC", "Temp11.8a", "Temp11.8b", "Temp10.63a", "Temp10.63b",
    "Temp9.46", "Temp8.29a", "Temp8.29b", "Temp7.12", "Temp5.95a",
    "Temp5.95b", "Temp4.78", "Temp3.61a", "Temp3.61b", "Temp2.44",
    "Temp1.27a", "Temp1.27b", "Temp0.1a", "Temp0.1b", "Umid. 01",
    "Umid. 02", "Umid. 03"];

export var tempLoc = [-11.8, -10.63, -9.46, -8.29, -7.12, -5.95, -4.78, -3.61, -2.44, -1.27, -0.1];
export var tempVal = Array(11).fill(0);
export var waterProbeElev = -12.75; // elevation of water-level probe in m

function pushValid(list, cont) {
    if (cont) {
        list.push(cont.v);
    } else {
        list.push(NaN);
    }
}

export function fillColumns(cols, rows) {
    for (var i = 0; i < cols.length; i++) {
        cols[i] = [];
        for (var j = 0; j < rows.length; j++) {
            pushValid(cols[i], rows[j].c[i]);
        }
    }
}

export function fixDataUnits(cols) {
    // convert time strings to timestamps
    const offset = new Date("1990-01-01T00:00:00.000Z").getTime()
    rawData[0].forEach((val, idx, arr) => { arr[idx] = new Date(cols[2][idx] * 1000 + offset) });
    // divide by 1e6 to recover floats
    for (var i = 3; i < cols.length; i++) {
        cols[i].forEach((elem, idx, arr) => { arr[idx] = elem / 1e6 });
    }
    // remove offset of water level and convert from mm to m
    cols[13].forEach((elem, idx, arr) => { arr[idx] = waterProbeElev + elem / 1000 });
}

// class with utilities to deal with temperatures

const tempSigMax = 0.1;

class TempMeas {
    constructor() {
        console.log("creating TempMeas");
        this.T1 = 0;
        this.T2 = 0;
        this.Tavg = 0;
        this.Tsig = 0;
        this.consistent = true;
    }
    update(T1, T2) {
        this.T1 = T1;
        this.T2 = T2;
        this.Tavg = 0.5 * (this.T1 + this.T2);
        this.Tsig = Math.sqrt(((this.T1 - this.Tavg) * (this.T1 - this.Tavg) + (this.T2 - this.Tavg) * (this.T2 - this.Tavg)) / 2);
        this.consistent = (this.Tsig < tempSigMax);
        //console.log(this);
    }
}
var tempMeas = Array(11);
var initSeq = [16, 17, 18, 19, 20, 20, 21, 22, 23, 23, 24, 25, 26, 26, 27, 28, 29, 29, 30, 31, 32, 33];

function getValid(tl, tm, tr) {
    if (tm.consistent) {
        return tm.Tavg;
    }

    if (!tl) { // ignore left
        if (tm.Tsig < tr.Tsig) {
            return tm.Tavg;
        } else {
            if (Math.abs(tm.T1 - tr.Tavg) < Math.abs(tm.T2 - tr.Tavg)) {
                return tm.T1;
            } else {
                return tm.T2;
            }
        }
    }
    if (!tr) { // ignore right
        if (tm.Tsig < tl.Tsig) {
            return tm.Tavg;
        } else {
            if (Math.abs(tm.T1 - tl.Tavg) < Math.abs(tm.T2 - tl.Tavg)) {
                return tm.T1;
            } else {
                return tm.T2;
            }
        }
    }
    // choose closest value to the neighbor average
    var Tm = 0.5 * (tl.Tavg + tr.Tavg);
    if (Math.abs(tm.T1 - Tm) < Math.abs(tm.T2 - Tm)) {
        return tm.T1;
    } else {
        return tm.T2;
    }
}

export function refreshTempData(idx) {
    for (var i = 0; i < 11; i++) {
        if (!tempMeas[i]) { tempMeas[i] = new TempMeas(); }
        tempMeas[i].update(rawData[initSeq[2 * i]][idx], rawData[initSeq[2 * i + 1]][idx]);
    }
    for (var i = 0; i < 11; i++) {
        tempVal[i] = getValid(tempMeas[i - 1], tempMeas[i], tempMeas[i + 1]);
    }
}