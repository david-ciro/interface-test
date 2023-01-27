import { insert_text, set_progress } from "./methods.js";
import { rawData, colNames, tempVal, tempLoc, fillColumns, fixDataUnits, refreshTempData } from "./fetchData.js";
import { calcDepletion, subsEnergy, subsNames, soil, specEnergy } from "./nszd.js"

const sheetId = '1DEXfEHcYPDpwHixNWlKuEInPXm1Wm4s9mrNQVCynzFw';
const sheetIdTest = '1KZGoeeMbVXvKwRWvSkvb9_3NhYWTse_o0GvytZtiT_U';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const query = encodeURIComponent('Select *');
const url = `${base}&tq=${query}`;

// current data being visualized
var dataIdx = 0;

insert_text("console", "Aguardando dados da estação...");

fetch(url)
    .then(res => res.text())
    .then(data => {
        insert_text("console", "Dados adquiridos");
        const temp = data.substring(47).slice(0, -2);
        const json = JSON.parse(temp);
        const rows = json.table.rows;
        console.log("rows: ", rows);
        fillColumns(rawData, rows);
        insert_text("console", "Carregados " + rawData[0].length + " registros");
        insert_text("console", "Efetuando conversão de unidades...");
        fixDataUnits(rawData);
        const offset = new Date("1990-01-01T00:00:00.000Z").getTime()
        const date = new Date(rawData[2][0] * 1000 + offset);
        console.log("date: ", date, ", offset: ", offset);
        console.log("raw data: ", rawData);
    })
    .then(res => {
        // create raw plot traces
        var raw_plot_traces = [];
        for (var i = 0; i < rawData.length; i++) {
            raw_plot_traces.push({
                name: colNames[i],
                x: rawData[0],
                y: rawData[i],
                type: 'scatter',
                visible: false,
            })
        }
        // populate raw plot
        var raw_plot_layout = {
            title: 'Dados brutos',
            font: { size: 13 },
            showlegend: false,
            colorway: ['#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
                '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe',
                '#008080', '#e6beff', '#aa6e28', '#fffac8', '#800000',
                '#aaffc3', '#808000', '#ffd8b1', '#000080', '#808080',
                '#ffffff', '#000000'],
        };
        var raw_plot_config = { responsive: true };
        var rawPlot = document.getElementById('fig-view-raw');
        Plotly.newPlot('fig-view-raw', raw_plot_traces, raw_plot_layout, raw_plot_config);
        // create raw plot toggle
        var rawToggleTable = document.getElementById("toggle-view-raw");
        for (var i = 3; i < rawData.length; i++) {
            var row = rawToggleTable.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var toggleId = 'toggle-raw-' + i;
            cell1.innerHTML = "<label for='" + toggleId + "'>" + colNames[i] + "</label>";
            cell2.innerHTML = "<input type='checkbox' value = " + i + " id='" + toggleId + "'>";
            // enable toggling hability
            document.getElementById(toggleId).onchange = function () {
                //toggle_trace_view(rawPlot, this.value);
                rawPlot.data[this.value].visible = !(rawPlot.data[this.value].visible);
                Plotly.update('fig-view-raw', raw_plot_traces, raw_plot_layout);
            };
        }
    })
    .then(res => {
        insert_text("console", "Criando visualizador instantâneo...");
        // get temperature data
        dataIdx = Math.floor(Math.random() * rawData[0].length);
        refreshTempData(dataIdx);
        // create profile plot
        var profile_traces = [];
        profile_traces.push({
            name: "temperaturas",
            x: tempVal,
            y: tempLoc,
            line: { shape: 'spline' },
            type: 'scatter',
            visible: true,
        });
        // populate raw plot
        var profile_layout = {
            title: 'Perfil de temperatura',
            font: { size: 13 },
            showlegend: false,
            xaxis: {
                title: "Temperatura (°C)",
                range: [20, 35]
            },
            yaxis: {
                title: "Elevação (m)",
            }
        };
        var profile_config = { responsive: true };
        Plotly.newPlot('fig-profile', profile_traces, profile_layout, profile_config);

        // create instant visualizer
        var rawViewTable = document.getElementById("view-meas-value");
        for (var i = 3; i < rawData.length; i++) {
            var row = rawViewTable.insertRow();
            var cell1 = row.insertCell(0);
            var cell2 = row.insertCell(1);
            var viewId = 'view-meas-' + i;
            cell1.innerHTML = "<label for='" + viewId + "'>" + colNames[i] + "</label>";
            cell2.innerHTML = "<input type='number' disabled id='" + viewId + "'>";
        }
        // enable navigation bar
        document.getElementById("idx-meas").min = 0;
        document.getElementById("idx-meas").max = rawData[0].length - 1;
        document.getElementById("idx-meas").value = dataIdx;
        document.getElementById("idx-meas").oninput = function () {
            dataIdx = this.value;
            // put in form: "yyyy-MM-ddThh:mm"
            const date = rawData[0][dataIdx];
            var dateString = date.toISOString();
            dateString = dateString.substring(0, dateString.length - 8);
            document.getElementById("time-view").value = dateString;
            // fill data visualizer
            for (var i = 3; i < rawData.length; i++) {
                var viewId = 'view-meas-' + i;
                var val = rawData[i][dataIdx];
                if (!isNaN(val)) {
                    document.getElementById(viewId).value = rawData[i][dataIdx];
                }
            }
            // update temperature profile
            refreshTempData(dataIdx);
            profile_layout.title.text = "Perfil de temperatura<br>" + rawData[0][dataIdx].toLocaleString();
            profile_layout.title.size = 10;
            Plotly.update('fig-profile', profile_traces, profile_layout);
            // update depletion figure pointer
            var nszdPlot = document.getElementById("fig-depletion");
            nszdPlot.data[0].x[0] = rawData[0][dataIdx];
            nszdPlot.data[0].x[1] = rawData[0][dataIdx];
            nszdPlot.data[0].y[0] = 0;
            nszdPlot.data[0].y[1] = nszdPlot.data[1].y[dataIdx];
            Plotly.redraw("fig-depletion");
        }
    })
    .then(res => {
        // loading substances
        insert_text("console", "Carregando substâncias...");
        for (var i = 0; i <= subsNames.length; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.innerHTML = subsNames[i];
            document.getElementById("substance").appendChild(opt);
        }
        // loading soil data to controls
        document.getElementById("substance").value = 0;
        document.getElementById("spec-energy").value = subsEnergy[0] / 1000;
        document.getElementById("porosity").value = soil.phi;
        document.getElementById("therm-cap").value = soil.cSat / 1e6;
        document.getElementById("therm-cond").value = soil.kSat;
        document.getElementById("vang-coef").value = soil.vg_alpha;
        document.getElementById("vang-exp").value = soil.vg_n;
        // adding functionality to substance
        document.getElementById("substance").onchange = function(){
            if (this.value == 0){
                document.getElementById("spec-energy").disabled = false;
            } else {
                document.getElementById("spec-energy").disabled = true;
                document.getElementById("spec-energy").value = subsEnergy[this.value]/1000; 
            }
        }

        // adding functionality to recalculate
        var apxMass = Array(rawData[0].length).fill(0);

        document.getElementById("recalculate").onclick = function (){
            soil.phi = document.getElementById("porosity").value;
            soil.cSat = 1e6 * document.getElementById("therm-cap").value;
            soil.kSat = document.getElementById("therm-cond").value;
            soil.vg_alpha = document.getElementById("vang-coef").value;
            soil.vg_n = document.getElementById("vang-exp").value;
            specEnergy = 1000 * document.getElementById("spec-energy").value;

            calcDepletion(rawData[2], rawData[13], apxMass);
        }

        var pointerX = [rawData[0][dataIdx], rawData[0][dataIdx]];
        var pointerY = [0, apxMass[dataIdx]];
        var nszd_traces = [];
        // cursor
        nszd_traces.push({
            name: "Registro",
            x: pointerX,
            y: pointerY,
        });
        // mass trace
        nszd_traces.push({
            name: "Massa degradada (g/m²)",
            x: rawData[0],
            y: apxMass,
            line: { shape: 'spline' },
            type: 'scatter',
            visible: true,
        });

        // populate raw plot
        var nszd_layout = {
            title: 'Depleção de Massa do contaminante',
            font: { size: 13 },
            showlegend: true,
            legend: {
                x: 1,
                xanchor: 'right',
                y: 1
            },
            xaxis: { title: "Tempo" }
        };
        var nszd_config = { responsive: true };
        Plotly.newPlot('fig-depletion', nszd_traces, nszd_layout, nszd_config);

        insert_text("console", "Calculando a depleção de massa do contaminante...");
        calcDepletion(rawData[2], rawData[13], apxMass);
        Plotly.update('fig-depletion', nszd_traces, nszd_layout);
    })