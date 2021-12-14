
const express = require('express');
// const { json } = require('express/lib/response');
const fs = require('fs');
var format = require('pg-format');
const apiRouter = express.Router();
// const aplikacija = require('../server');
const pool = require('../db/pgadmin');

const bodyParser = require('body-parser'); // mozda mi ne treba??
apiRouter.use(bodyParser.urlencoded({extended: true}));
apiRouter.use(express.json());
// jel mogu ovo povuc sa server.js
const downloadSelect = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT ||
        CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa,
        gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,
        hotel.brojzvjezdica, json_build_object('googlerating', ratings.googlerating,
            'bookingrating', ratings.bookingrating, 'tivagorating', ratings.trivagorating) AS ratings,
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

// jel mogu ovo povuc sa server.js
var count = fs.readFile("hoteli.json", "utf-8", (err, data) => {
    if (err) throw err;
    count = JSON.parse(data).length;
    return count;
});        



//a) na /api/hoteli
apiRouter.get('/', async (req, res) => {
    fs.readFile("../hoteli.json", "utf-8", function (err, data) {
        if (err) throw err;
        data = JSON.parse(data);
        // console.log(data)
        // data = data.toString();
        res.set({
            'method' : 'GET',
            'status' : '200 OK',
            'message' : 'All data fetched',
            'Content-type': 'application/json'            
        });
        res.send(data);
    });
});

//b) na /api/hoteli/:id
apiRouter.get('/:id', async (req, res) => {
    const id = req.params.id;
    if (isNaN(id)) {
        res.set({
            'method' : 'GET',
            'status' : '400 Bad Request',
            'message' : "The server could not understand the request due to invalid syntax.",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "Bad Request",
            'message' : "The server could not understand the request due to invalid syntax.",
            "response" : null
        };
        res.send(400, response);
    }
    if (id > count || id < 1) {
        res.set({
            'method' : 'GET',
            'status' : '404 Not Found',
            'message' : "Hotel with the provided id doesn't exist",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "Not Found",
            'message' : "Hotel with the provided id doesn't exist",
            'response' : null
        };
        res.send(404, response);
    }
    var sqlic = format(`%s WHERE hotel.hotelid=%s`, downloadSelect, id);
    var api = format(`COPY (select json_agg(row_to_json(hoteli)) FROM (%s) hoteli)
                    to 'D:/fax/or/labosi/gitty/hoteli/lab2/files/api.json'`, sqlic);
    await pool.query(api);

    fs.readFile("./files/api.json", "utf-8", function (err, data) {
        if (err) throw err;
        data = JSON.parse(data);
        // console.log(data)
        // data = data.toString();
        res.set({
            'method' : 'GET',
            'status' : '200 OK',
            'message' : 'All data fetched',
            'Content-type': 'application/json',
            'warning': "with content type charset encoding will be added by default"
        });
        // res.send(200, data);
        res.status(200).send(data);
        
        // var display = JSON.parse(data);
        // console.log(display);
        // res.send(display);
    }); 
});

// const course = courses.find( c => c.id === parseInt(req.params.id))


//c)


//d) /api/hoteli
apiRouter.post('/', async (req, res) => {
    if (!req.body.naziv || !req.body.adresa || !req.body.grad || !req.body.zupanija ||
        !req.body.drzava || !req.body.brojzvjezdica || !req.body.googlerating ||
        !req.body.bookingrating || !req.body.trivagorating || !req.body.weburl ||
        !req.body.telefon || !req.body.email) {
            res.status(400).send('Invalid input');
        }
        
    let data = req.body;
    const naziv = req.body.naziv;
    const adresa = req.body.adresa;
    const grad = req.body.grad;
    const zupanija = req.body.zupanija;
    const drzava = req.body.drzava;
    const brojzvjezdica = req.body.brojzvjezdica;
    const googlerating = req.body.googlerating;
    const bookingrating = req.body.bookingrating;
    const trivagorating = req.body.trivagorating;
    const weburl = req.body.weburl;
    const telefon = req.body.telefon;
    const email = req.body.email;

    // let sqlic = 'SELECT nazivdrzave FROM drzave';
    // let redovi = (await pool.query(sqlic)).rows;
    // let postoji = false;
    // for (naz of redovi) {
    //     if (naz.nazivdrzave === drzava) {
    //         postoji = true;
    //         break;
    //     }
    // }
    // if (!postoji) {
    //     let sql = format(`INSERT INTO drzave (nazivDrzave) VALUES('%s');`, drzava)
    //     // await pool.query(`INSERT INTO drzave (nazivDrzave) VALUES('$1');`, [drzava]);
    //     await pool.query(sql);
    //     // await pool.query(`DELETE FROM drzave WHERE drzavaid=3;`);
    // }
    
// format hmmmm
    let hmmmm = `
    INSERT INTO drzave (nazivDrzave) VALUES('Republika Hrvatska');
    INSERT INTO zupanije (nazivZupanije, drzavaId) VALUES ('Grad Zagreb',
            (SELECT drzavaId FROM drzave WHERE nazivdrzave LIKE 'Republika Hrvatska'));
    INSERT INTO gradovi (nazivGrada, zupanijaId) VALUES ('Zagreb',
            (SELECT zupanijaId FROM zupanije WHERE nazivZupanije LIKE 'Grad Zagreb'));
    INSERT INTO ulice (nazivUlice, gradId) VALUES ('Rudeška cesta',
            (SELECT gradId FROM gradovi WHERE nazivGrada LIKE 'Zagreb'));
    INSERT INTO adrese (ulicaId, broj, dodatnaOznaka) VALUES (1, 140, null);
    INSERT INTO ratings (googlerating, bookingrating, trivagorating) VALUES (4.6, 9.3, 8.9);
    INSERT INTO kontakt (brojtelefona, email) VALUES ('013322901', 'info@admiralhotel.hr');
    INSERT INTO hotel (naziv, adresaid, brojzvjezdica, ratingid, weburl, kontaktid) VALUES
            ('Admiral Hotel',
            (SELECT adresaid FROM adrese WHERE (ulicaid=1 and broj=140 and dodatnaoznaka is null)),
            4,
            (SELECT ratingid FROM ratings WHERE (googlerating=4.6 and bookingrating=9.3 and trigavorating=8.9)),
            'https://www.admiralhotel.hr/',
            (SELECT kontaktid FROM kontakt WHERE (brojtelefona like '013322901' and email like 'info@admiralhotel.hr');`;


    // async function databaseChecker(key, value, tableName, atribut) {
    //     let sqlic = format('SELECT %s FROM %s', atribut, tableName);
    //     let redovi = (await pool.query(sqlic)).rows;
    //     let postoji = false;
    //     for (red of redovi) {
    //         if (red.atribut === key) {
    //             postoji = true;
    //             return true;
    //         }
    //     }
    //     await pool.query(`INSERT INTO $1 ($2) VALUES('$3');`, [tableName, atribut, value]);
    // }
    // console.log(databaseChecker(drzava, 'Republika Hrvatska', 'drzave', 'nazivdrzave'));

    // sqlic = 'SELECT naziv FROM hotel';
    // nez = (await pool.query(sqlic)).rows;
    // postoji = false;
    // for (naz of nez) {
    //     if (naz.naziv === naziv) {
    //         postoji = true;
    //     }
    // }
    // console.log(postoji);
    // res.body = { 'joj': 'jojoj'};
    res.status(200).send(data);
});

//e) /api/hoteli/:id
apiRouter.put('/:id', async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    var sqlic = format(`UPDATE hotel
            SET naziv = 'Sheraton'

            
            
            WHERE hotelid=%s`, id);
    await pool.query(sqlic);

    res.status(200).send("");

});


//f) /api/hoteli/:id
apiRouter.delete('/:id', (req, res) => {

});
// /api/hoteli/:id
apiRouter.patch('/:id', async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    var sqlic = format(`UPDATE hotel
            SET naziv = 'Sheraton'
            WHERE hotelid=%s`, id);
    await pool.query(sqlic);

    res.status(200).send("");
});
module.exports = apiRouter;