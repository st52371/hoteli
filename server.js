
const express = require('express');
const app = express();
// const {Pool} = require('pg');
// const http = require('http');
const fs = require("fs");
// const axios = require("axios");
const api = require('./routes/api.route');
var format = require('pg-format');
const pool = require('./db/pgadmin');


app.use("/api/hoteli", api);


app.set('view engine', 'ejs');
// to serve static files
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));


// var count = 0;
// var count = fs.readFile("hoteli.json", "utf-8", (err, data) => {
//     if (err) throw err;
//     count = JSON.parse(data).length;
//     return count;
// });



const downloadSelect = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT ||
        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa,
        gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,
        hotel.brojzvjezdica, json_build_object('googlerating', ratings.googlerating,
            'bookingrating', ratings.bookingrating, 'trivagorating', ratings.trivagorating) AS ratings,
        hotel.weburl,kontakt.brojtelefona AS telefon, kontakt.email AS email
        FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid
        NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave
        LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid
        LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid`;

const displaySelect = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT ||
        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa,
        gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,
        hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating,
        ratings.trivagorating AS trivagorating, hotel.weburl, kontakt.brojtelefona AS telefon, kontakt.email AS email
        FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid
        NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije
        NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid
        LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid`;

// const selectWithId = `SELECT hotel.hotelid, hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT ||
//         CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa,
//         gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,
//         hotel.brojzvjezdica, json_build_object('googlerating', ratings.googlerating,
//             'bookingrating', ratings.bookingrating, 'tivagorating', ratings.trivagorating) AS ratings,
//         hotel.weburl,kontakt.brojtelefona AS telefon, kontakt.email AS email
//         FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid
//         NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave
//         LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid
//         LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid`;

// putanje za saveanje filtriranih fileova
const jsonPath = 'D:/fax/or/labosi/gitty/hoteli/files/hoteli.json';
const csvPath = 'D:/fax/or/labosi/gitty/hoteli/files/hoteli.csv';

// za prikaz podataka
const attributes = ['naziv', 'adresa', 'grad', 'zupanija', 'drzava', 'brojzvjezdica', 'googlerating',
                    'bookingrating', 'trivagorating', 'weburl', 'telefon', 'email'];
const attributes2 = [{display: 'Naziv', sql: 'hotel.naziv'},
                    {display: 'Adresa', sql: 'adresa'},
                    {display: 'Grad', sql: 'gradovi.nazivgrada'},
                    {display: 'Županija', sql: 'zupanije.nazivzupanije'},
                    {display: 'Država', sql: 'drzave.nazivdrzave'},
                    {display: 'Broj zvjezdica', sql: 'hotel.brojzvjezdica'},
                    {display: 'Google rating', sql: 'ratings.googlerating'},
                    {display: 'Booking.com rating', sql: 'ratings.bookingrating'},
                    {display: 'Trivago.hr rating', sql: 'ratings.trivagorating'},
                    {display: 'URL web stranice', sql: 'hotel.weburl'},
                    {display: 'Broj telefona', sql: 'kontakt.brojtelefona'},
                    {display: 'Email', sql: 'kontakt.email'}
                    ];
// prikaz stranice s metapodacima
app.get('/metapodaci', async (req, res) => {
    res.render('index');
})
// prikaz svih podataka pri ucitavanju stranice
app.get('/', async (req, res) => {
    // promjena original fileova u slucaju updateanja baze
    var json = format(`COPY (select json_agg(row_to_json(hoteli))
                FROM (%s) hoteli) to 'D:/fax/or/labosi/gitty/hoteli/hoteli.json'`, downloadSelect);
    var csv = format(`COPY (%s) TO 'D:/fax/or/labosi/gitty/hoteli/hoteli.csv'
                DELIMITER ',' ENCODING 'utf-8' CSV HEADER`, downloadSelect);
    await pool.query(json);
    await pool.query(csv);
    const results = await pool.query(displaySelect);

    res.render('datatable', {
        rows: results.rows,
        attributes: attributes,
        attributes2: attributes2
    });
});



// filtrirani podaci
app.post('/', async (req, res) => {

    const searchattr = req.body.searchattr;

    // nisu postavljeni nikakvi parametri
    if (!req.body.searchterm && !req.body.searchattr) {
        var sqlic = displaySelect;
        var result = await pool.query(sqlic);

        var json = format(`COPY (select json_agg(row_to_json(hoteli)) FROM (%s) hoteli) to '%s'`, downloadSelect, jsonPath);
        var csv = format(`COPY (%s) TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`, downloadSelect, csvPath);
        
    
    // postavljen je samo parametar vrijednosti
    } else if (!req.body.searchattr) {
        // broj je
        if (!isNaN(req.body.searchterm)) {
            // za prikaz u tablici
            const searchterm = parseFloat(req.body.searchterm);
            const searchtermtext = '%' + req.body.searchterm + '%';
            let search = `cast(hotel.brojzvjezdica as double precision)=$1 or ratings.googlerating=$1
                            or ratings.bookingrating=$1 or ratings.trivagorating=$1 or adrese.broj=$1
                            or kontakt.brojtelefona like $2`
            var sqlic = format(`%s WHERE %s `, displaySelect, search);
            var result = await pool.query(sqlic, [searchterm, searchtermtext]);

            // za skidanje podataka
            var json = format(`COPY (select json_agg(row_to_json(hoteli))
                        FROM (%s 
                        WHERE cast(hotel.brojzvjezdica as double precision)=%s
                        or ratings.googlerating=%s or ratings.bookingrating=%s
                        or ratings.trivagorating=%s) hoteli)
                        to '%s'`,
                        downloadSelect, searchterm, searchterm, searchterm, searchterm, jsonPath);
            var csv = format(`COPY (%s 
                        WHERE cast(hotel.brojzvjezdica as double precision)=%s or
                        ratings.googlerating=%s or ratings.bookingrating=%s or ratings.trivagorating=%s)
                        TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`,
                        downloadSelect, searchterm, searchterm, searchterm, searchterm, csvPath);

        // rijec je
        } else {
            // za prikaz u tablici
            // const searchterm = format("%%s%", req.body.searchterm.toLowerCase());
            const searchterm = '%' + req.body.searchterm.toLowerCase() + '%';
            let search = `LOWER(hotel.naziv) like $1 or LOWER(ulice.nazivulice) like $1 or LOWER(gradovi.nazivgrada) like $1
                        or LOWER(zupanije.nazivzupanije) like $1 or LOWER(drzave.nazivdrzave) like $1
                        or hotel.weburl like $1 or kontakt.email like $1`;
            var sqlic = format(`%s WHERE %s`, displaySelect, search);
            var result = await pool.query(sqlic, [searchterm]);

            // za skidanje podataka
            var json = format(`COPY (select json_agg(row_to_json(hoteli))
                        FROM (%s 
                        WHERE hotel.naziv like '%s' or ulice.nazivulice like '%s'
                        or gradovi.nazivgrada like '%s' or zupanije.nazivzupanije like '%s'
                        or drzave.nazivdrzave like '%s' or hotel.weburl like '%s'
                        or kontakt.email like '%s') hoteli)
                        to '%s'`,
                        downloadSelect, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, jsonPath);
            var csv = format(`COPY (%s 
                        WHERE hotel.naziv like '%s' or ulice.nazivulice like '%s'
                        or gradovi.nazivgrada like '%s' or zupanije.nazivzupanije like '%s'
                        or drzave.nazivdrzave like '%s' or hotel.weburl like '%s' or kontakt.email like '%s')
                        TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`,
                        downloadSelect, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, searchterm, csvPath);
        }
    // postavljena su oba parametra
    } else {
        // odabrana je adresa
        if (searchattr === 'adresa') {
            // const searchterm = format('%%s%', req.body.searchterm);
            const searchterm = '%' + req.body.searchterm.toLowerCase() + '%';
            let search = `LOWER(ulice.nazivulice) || ' ' || adrese.broj::TEXT ||
                        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END LIKE LOWER($1)`;
            var sqlic = format(`%s WHERE %s`, displaySelect, search);
            var result = await pool.query(sqlic, [searchterm]);

            var json = format(`COPY (select json_agg(row_to_json(hoteli))
                        FROM (%s 
                        WHERE ulice.nazivulice || ' ' || adrese.broj::TEXT ||
                        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END LIKE '%s') hoteli)
                        to '%s'`,
                        downloadSelect, searchterm, jsonPath);
            var csv = format(`COPY (%s 
                        WHERE ulice.nazivulice || ' ' || adrese.broj::TEXT ||
                        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END LIKE '%s')
                        TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`,
                        downloadSelect, searchterm, csvPath);

        // odabran je atribut koji je broj
        } else if (isNum(searchattr)) {
            const searchterm = req.body.searchterm;
            var sqlic = format(`%s WHERE %s=$1`, displaySelect, searchattr, searchattr);
            var result = await pool.query(sqlic, [searchterm]);

            var json = format(`COPY (select json_agg(row_to_json(hoteli))
                        FROM (%s 
                        WHERE %s=%s) hoteli)
                        to '%s'`,
                        downloadSelect, searchattr, searchterm, jsonPath);
            var csv = format(`COPY (%s 
                        WHERE %s=%s)
                        TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`,
                        downloadSelect, searchattr, searchterm, csvPath);
        
        // odabran je atribut koji je rijec
        } else {
            // const searchterm = format('%%s%', req.body.searchterm);
            const searchterm = '%' + req.body.searchterm.toLowerCase() + '%';
            var sqlic = format(`%s WHERE LOWER(%s) like LOWER('%s')`, displaySelect, searchattr, searchterm);
            var result = await pool.query(sqlic);

            var json = format(`COPY (select json_agg(row_to_json(hoteli))
                        FROM (%s 
                        WHERE %s LIKE '%s') hoteli)
                        to '%s'`,
                        downloadSelect, searchattr, searchterm, jsonPath);
            var csv = format(`COPY (%s 
                        WHERE %s LIKE '%s')
                        TO '%s' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`,
                        downloadSelect, searchattr, searchterm, csvPath);
        }
    }

    await pool.query(json);
    await pool.query(csv);
    
    const results = result;
    // console.log(results.rows);
    // console.table(results.rows);
    
    res.render('datatable', {
        text: 'world',
        rows: results.rows,
        attributes: attributes,
        attributes2: attributes2
    });

});

app.use((req, res) => {
    console.log(req.method)
    if(req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
        let response = {
            "status": "501 Not Implemented",
            "message": "The request method is not supported by the server and cannot be handled.",
            "response": null
        }
        res.set({
            'method' : req.method,
            'status' : '501 Not Implemented',
            'message' : 'The request method is not supported by the server and cannot be handled.',
            'Content-type': 'application/json'            
        });
        res.status(501).send(response);
    }
    let response = {
        "status": "404 Not Found",
        "message": "The server can not find the requested resource. Given URL is not recognized.",
        "response": null
    }
    res.set({
        'method' : req.method,
        'status' : '404 Not Found',
        'message' : 'The server can not find the requested resource. Given URL is not recognized.',
        'Content-type': 'application/json'            
    });
    res.status(404).send(response);
});

function isNum(num) {
    if (num === 'hotel.brojzvjezdica' || num === 'ratings.googlerating' ||
        num === 'ratings.bookingrating' || num === 'ratings.trigavorating')
        return true;
    else
        return false;
}

app.listen(3000);