const express = require('express');
const fs = require('fs');
var format = require('pg-format');
const apiRouter = express.Router();
// const aplikacija = require('../server');
const pool = require('../db/pgadmin');

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


// na /getdata
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

// na /getdata/:id
apiRouter.get('/:id', async (req, res) => {
    const id = req.params.id;
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
            'Content-length': '100',
            'warning': "with content type charset encoding will be added by default"
        });
        res.send(data);
        
        // var display = JSON.parse(data);
        // console.log(display);
        // res.send(display);
    }); 

});




module.exports = apiRouter;