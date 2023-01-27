const sheetId = '1KZGoeeMbVXvKwRWvSkvb9_3NhYWTse_o0GvytZtiT_U';
const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?`;
const sheetName = 'MyPage';
const query = encodeURIComponent('Select *')
const url = `${base}&tq=${query}`

fetch(url)
        .then(res => res.text())
        .then(data => {
            const temp = data.substring(47).slice(0, -2);
            const json = JSON.parse(temp);
            const rows = json.table.rows;
            rows.forEach((row) => {
                console.log(row.c);
            });
        })