export function insert_text(targetId, text){
    let ele = document.getElementById(targetId);
    ele.innerHTML += "🠖 ";
    ele.innerHTML += text;
    ele.innerHTML += "<br>";
}

export function set_progress(progress_elem, value){
    if (Math.abs(progress_elem.value-value) > 0.05 || value > 0.99){ // 5% increase
        console.log("progress: ", value);
        progress_elem.value = value;
    }
}