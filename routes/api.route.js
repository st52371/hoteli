
const { resolveSoa } = require('dns');
const express = require('express');
// const { json } = require('express/lib/response');
const fs = require('fs');
var format = require('pg-format');
const apiRouter = express.Router();
// const aplikacija = require('../server');
const pool = require('../db/pgadmin');

// const bodyParser = require('body-parser'); // mozda mi ne treba??
// const { max } = require('pg/lib/defaults');
// apiRouter.use(bodyParser.urlencoded({extended: true}));
apiRouter.use(express.json());

const selectWithId = `SELECT hotel.hotelid, hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT ||
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


//a) na /api/hoteli
apiRouter.get('/', async (req, res) => {
    fs.readFile("./hoteli.json", "utf-8", function (err, data) {
        if (err) throw err;
        data = JSON.parse(data);
        // console.log(data)

        let response = format(`{
            "status": "200 OK",
            "message": "All data fetched",
            "response": [%s]
        }`, data);
        res.set({
            'method' : 'GET',
            'status' : '200 OK',
            'message' : 'All data fetched',
            'Content-type': 'application/json'            
        });
        res.status(200).send(response);
    });
});

//b) na /api/hoteli/:id
apiRouter.get('/:id', async (req, res) => {
    const id = req.params.id;
    // var maxid = (await pool.query(`select max(hotelid) from hotel`)).rows[0].max;
    var ids = (await pool.query('select hotelid from hotel')).rows;

    if (isNaN(id)) {
        res.set({
            'method' : 'GET',
            'status' : '400 Bad Request',
            'message' : "The server could not understand the request due to invalid syntax.",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "400 Bad Request",
            'message' : "The server could not understand the request due to invalid syntax.",
            "response" : null
        };
        res.status(400).send(response);
    }

    let postoji = false;
    for (var i = 0; i < ids.length; i++) {
        if (id === ids[i].hotelid.toString()) {
            postoji = true;
            break;
        }
    }
    if (!postoji) {
        res.set({
            'method' : 'GET',
            'status' : '404 Not Found',
            'message' : "Hotel with the provided id doesn't exist",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "404 Not Found",
            'message' : "Hotel with the provided id doesn't exist",
            'response' : null
        };
        res.status(404).send(response);
    }
    var sqlic = format(`%s WHERE hotel.hotelid=%s`, selectWithId, id);
    var api = format(`COPY (select json_agg(row_to_json(hoteli)) FROM (%s) hoteli)
                    to 'D:/fax/or/labosi/gitty/hoteli/files/api.json'`, sqlic);
    await pool.query(api);

    fs.readFile("./files/api.json", "utf-8", function (err, data) {
        if (err) throw err;
        data = JSON.parse(data);
        
        let response = format(`{
            "status": "200 OK",
            "message": "Data with id = %s fetched",
            "response": [%s]
        }`, id, data);
        res.set({
            'method' : 'GET',
            'status' : '200 OK',
            'message' : 'All data fetched',
            'Content-type': 'application/json',
            'warning': "with content type charset encoding will be added by default"
        });
        // res.send(200, response);
        res.status(200).send(response);
    }); 
});


//c)


//d) /api/hoteli
apiRouter.post('/', async (req, res) => {
    var maxidBefore = (await pool.query(`select max(hotelid) from hotel`)).rows[0].max;
    var ids = (await pool.query('select hotelid from hotel')).rows;

    if (!req.body.naziv || !req.body.adresa || !req.body.grad || !req.body.zupanija ||
        !req.body.drzava || !req.body.brojzvjezdica || !req.body.googlerating ||
        !req.body.bookingrating || !req.body.trivagorating || !req.body.weburl ||
        !req.body.telefon || !req.body.email) {
            res.status(400).send('Invalid input');
        }
        
    let data = req.body;
    const naziv = req.body.naziv;
// adresa begin
    let adresa = req.body.adresa.split(" ");
    let ulica = adresa[0];
    for (let i = 1; i < adresa.length - 1; i++) {
        ulica += " " + adresa[i];
    }
    let broj = adresa[adresa.length - 1];
    let dodatnaOznaka = (isNaN(broj.substring(broj.length - 1, broj.length)) ?
        broj.substring(broj.length - 1, broj.length) : "null");
    
    var sqlNull;
    if (dodatnaOznaka === "null") {
        // broj = broj;
        sqlNull = `is null`;
    } else {
        broj = broj.substring(0, broj.length-1);
        sqlNull = format(`like '%s'`, dodatnaOznaka);
    }
    let ulicaCount = (await pool.query(format(`select count(ulicaid) from ulice where nazivulice like '%s'`, ulica))).rows[0].count;
    var ulicaid;
    if (ulicaCount > 0)
        ulicaid = (await pool.query(format(`select ulicaid from ulice where nazivulice like '%s'`, ulica))).rows[0].ulicaid;
    else
        ulicaid = await pool.query(`select max(ulicaid) from ulice`) + 1;
// adresa end

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


    // drzava
    var pokusaj = (await pool.query(format(`SELECT nazivDrzave FROM drzave WHERE nazivDrzave like '%s'`, drzava))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO drzave (nazivDrzave) VALUES('%s');`, drzava));
    // console.log(pokusaj);
    // zupanija
    pokusaj = (await pool.query(format(`SELECT nazivZupanije FROM zupanije WHERE nazivZupanije like '%s'`, zupanija))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO zupanije (nazivZupanije, drzavaId)
                VALUES ('%s', (SELECT drzavaId FROM drzave WHERE nazivdrzave LIKE '%s'));`, zupanija, drzava));
    // console.log(pokusaj);
    // grad
    pokusaj = (await pool.query(format(`SELECT nazivGrada FROM gradovi WHERE nazivGrada like '%s'`, grad))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO gradovi (nazivGrada, zupanijaId) VALUES
                ('%s', (SELECT zupanijaId FROM zupanije WHERE nazivZupanije LIKE '%s'));`, grad, zupanija));
    // console.log(pokusaj);
    // ulica
    pokusaj = (await pool.query(format(`SELECT nazivUlice FROM ulice WHERE nazivUlice like '%s'`, ulica))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO ulice (nazivUlice, gradId) VALUES
                ('%s', (SELECT gradId FROM gradovi WHERE nazivGrada LIKE '%s'));`, ulica, grad));
    // console.log(pokusaj);
    // adresa
    pokusaj = (await pool.query(format(`SELECT * FROM adrese
                WHERE ulicaid=%s and broj=%s and dodatnaoznaka %s`, ulicaid, broj, sqlNull))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO adrese (ulicaId, broj, dodatnaOznaka) VALUES
                (%s, %s, %s)`, ulicaid, broj, dodatnaOznaka));
    // console.log(pokusaj);
    // ratings
    pokusaj = (await pool.query(format(`SELECT * FROM ratings WHERE
                googlerating=%s and bookingrating=%s and trivagorating=%s`, googlerating, bookingrating, trivagorating))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO ratings
                (googlerating, bookingrating, trivagorating) VALUES (%s, %s, %s);`, googlerating, bookingrating, trivagorating));
    // console.log(pokusaj);
    // kontakt
    pokusaj = (await pool.query(format(`SELECT * FROM kontakt WHERE
                brojtelefona like '%s' and email like '%s'`, telefon, email))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO kontakt (brojtelefona, email) VALUES ('%s', '%s');`, telefon, email));
    // console.log(pokusaj);
    // hotel
    pokusaj = (await pool.query(format(`SELECT * FROM hotel LEFT JOIN adrese USING(adresaid)
                LEFT JOIN ulice USING (ulicaid) LEFT JOIN gradovi using (gradid) WHERE
                naziv like '%s' and nazivgrada like '%s'`, naziv, grad))).rows[0];
    if (!pokusaj) await pool.query(format(`INSERT INTO hotel (naziv, adresaid, brojzvjezdica, ratingid, weburl, kontaktid) VALUES
                ('%s', (SELECT adresaid FROM adrese WHERE (ulicaid=%s and broj=%s and dodatnaoznaka %s)),
                %s, (SELECT ratingid FROM ratings WHERE (googlerating=%s and bookingrating=%s and trivagorating=%s)),
                '%s', (SELECT kontaktid FROM kontakt WHERE (brojtelefona like '%s' and email like '%s')));`,
                naziv, ulicaid, broj, sqlNull, brojzvjezdica, googlerating, bookingrating, trivagorating,
                weburl, telefon, email));

    // promjena original json i csv fileova baze
    var json = format(`COPY (select json_agg(row_to_json(hoteli))
                FROM (%s) hoteli) to 'D:/fax/or/labosi/gitty/hoteli/hoteli.json'`, downloadSelect);
    var csv = format(`COPY (%s) TO 'D:/fax/or/labosi/gitty/hoteli/hoteli.csv'
                DELIMITER ',' ENCODING 'utf-8' CSV HEADER`, downloadSelect);
    await pool.query(json);
    await pool.query(csv);

    // dodaj u bazu ili vec postoji
    var maxidAfter = (await pool.query(`select max(hotelid) from hotel`)).rows[0].max;
    if (maxidBefore === maxidAfter) {
        var response = format(`{
            "status": "200 OK",
            "message": "Hotel with the provided information already exists",
            "response": [%s]
        }`, data);
        res.set({
            'method' : 'POST',
            'status' : '200 OK',
            'message' : 'Hotel with the provided information already exists',
            'Content-type': 'application/json'
        });
    } else {
        var response = format(`{
            "status": "201 Created",
            "message": "The request succeeded, and a new resource was created as a result",
            "response": [%s]
        }`, data);
        res.set({
            'method' : 'POST',
            'status' : '201 Created',
            'message' : 'The request succeeded, and a new resource was created as a result',
            'Content-type': 'application/json'
        });
    }
    response = JSON.parse(response)
    res.status(200).send(response);
});

//e) /api/hoteli/:id
apiRouter.put('/:id', async (req, res) => {
    const id = req.params.id;
    var ids = (await pool.query('select hotelid from hotel')).rows;
    if (isNaN(id)) {
        res.set({
            'method' : 'GET',
            'status' : '400 Bad Request',
            'message' : "The server could not understand the request due to invalid syntax.",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "400 Bad Request",
            'message' : "The server could not understand the request due to invalid syntax.",
            "response" : null
        };
        res.status(400).send(response);
    }
    let postoji = false;
    for (var i = 0; i < ids.length; i++) {
        if (id === ids[i].hotelid.toString()) {
            postoji = true;
            break;
        }
    }
    if (!postoji) {
        res.set({
            'method' : 'GET',
            'status' : '404 Not Found',
            'message' : "Hotel with the provided id doesn't exist",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "404 Not Found",
            'message' : "Hotel with the provided id doesn't exist",
            'response' : null
        };
        res.status(404).send(response);
    }
    const body = req.body;
    const original = (await pool.query(format(`%s WHERE hotelid=%s`, displaySelect, id))).rows[0];
    if (body.naziv !== original.naziv) {
        var sqlic = format(`UPDATE hotel SET naziv = '%s' WHERE hotelid=%s`, body.naziv, id);
        await pool.query(sqlic);
    }
    if (body.adresa !== original.adresa) {
        let adresa = body.adresa.split(" ");
        let ulica = adresa[0];
        for (let i = 1; i < adresa.length - 1; i++) {
            ulica += " " + adresa[i];
        }
        let adresaoriginal = original.adresa.split("");
        let ulicaoriginal = adresaoriginal[0];
        for (let i = 1; i < adresaoriginal.length - 1; i++) {
            ulicaoriginal += " " + adresaoriginal[i];
        }
        let broj = adresa[adresa.length - 1];
        let dodatnaOznaka = (isNaN(broj.substring(broj.length - 1, broj.length)) ?
            "'"+broj.substring(broj.length - 1, broj.length)+"'" : "null");
        if (dodatnaOznaka === "null") 
            broj = "'" + broj + "'";
        if (dodatnaOznaka !== "null")
            broj = "'" + broj.substring(0, broj.length-1) + "'";
        
            
        await pool.query(format(`UPDATE adrese SET broj=%s, dodatnaoznaka=%s WHERE adresaid=
                (SELECT adresaid FROM hotel WHERE hotelid=%s)`, broj, dodatnaOznaka, id));
        if (ulica !== ulicaoriginal) {
            await pool.query(format(`INSERT INTO ulice (nazivulice, gradid) VALUES
                    ('%s', (SELECT gradid FROM ulice WHERE nazivulice like '%s'))`, ulica, ulicaoriginal));
        }
    }
    if (body.grad !== original.grad) {
    }
    if (body.zupanija !== original.zupanija) {
    }
    if (body.drzava !== body.drzava) {
    }


    if (body.brojzvjezdica !== original.brojzvjezdica) {
        await pool.query(format(`UPDATE hotel SET brojzvjezdica=%s WHERE hotelid=%s`, body.brojzvjezdica, id));
    }
    if (body.googlerating !== original.googlerating) {
        await pool.query(format(`UPDATE ratings SET googlerating=%s WHERE ratingid=
                (SELECT ratingid FROM hotel WHERE hotelid=%s)`, body.googlerating, id));
    }
    if (body.bookingrating !== original.bookingrating) {
        await pool.query(format(`UPDATE ratings SET bookingrating=%s WHERE ratingid=
                (SELECT ratingid FROM hotel WHERE hotelid=%s)`, body.bookingrating, id));
    }
    if (body.trivagorating !== original.trivagorating) {
        await pool.query(format(`UPDATE ratings SET trivagorating=%s WHERE ratingid=
                (SELECT ratingid FROM hotel WHERE hotelid=%s)`, body.trivagorating, id));
    }
    if (body.weburl !== original.weburl) {
        await pool.query(format(`UPDATE hotel SET weburl = '%' WHERE hotelid=%s`, body.weburl, id));
    }
    if (body.telefon !== original.telefon) {
        await pool.query(format(`UPDATE kontakt SET brojtelefona = '%' WHERE kontaktid=
                (SELECT kontaktid FROM hotel WHERE hotelid=%s)`, body.telefon, id));
    }
    if (body.email !== original.email) {
        await pool.query(format(`UPDATE kontakt SET email = '%' WHERE kontaktid=
                (SELECT kontaktid FROM hotel WHERE hotelid=%s)`, body.email, id));
    }

    // promjena original json i csv fileova baze
    var json = format(`COPY (select json_agg(row_to_json(hoteli))
                FROM (%s) hoteli) to 'D:/fax/or/labosi/gitty/hoteli/hoteli.json'`, downloadSelect);
    var csv = format(`COPY (%s) TO 'D:/fax/or/labosi/gitty/hoteli/hoteli.csv'
                DELIMITER ',' ENCODING 'utf-8' CSV HEADER`, downloadSelect);
    await pool.query(json);
    await pool.query(csv);


    var response = format(`{
        "status": "200 OK",
        "message": "The request succeeded",
        "response": [%s]
    }`, body);
    response = JSON.parse(response);
    res.status(200).send(response);
            
});
        

//f) /api/hoteli/:id
apiRouter.delete('/:id', async (req, res) => {
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    const id = req.params.id;
    var ids = (await pool.query('select hotelid from hotel')).rows;
    if (isNaN(id)) {
        res.set({
            'method' : 'GET',
            'status' : '400 Bad Request',
            'message' : "The server could not understand the request due to invalid syntax.",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "400 Bad Request",
            'message' : "The server could not understand the request due to invalid syntax.",
            "response" : null
        };
        res.status(400).send(response);
    }
    let postoji = false;
    for (var i = 0; i < ids.length; i++) {
        if (id === ids[i].hotelid.toString()) {
            postoji = true;
            break;
        }
    }
    // console.log(req.method)
    if (!postoji) {
        res.set({
            'method' : 'GET',
            'status' : '404 Not Found',
            'message' : "Hotel with the provided id doesn't exist",
            'Content-type': 'application/json'
        });
        let response = {
            'status' : "404 Not Found",
            'message' : "Hotel with the provided id doesn't exist",
            'response' : null
        };
        res.status(404).send(response);
    }

    // promjena original json i csv fileova baze
    var json = format(`COPY (select json_agg(row_to_json(hoteli))
                FROM (%s) hoteli) to 'D:/fax/or/labosi/gitty/hoteli/hoteli.json'`, downloadSelect);
    var csv = format(`COPY (%s) TO 'D:/fax/or/labosi/gitty/hoteli/hoteli.csv'
                DELIMITER ',' ENCODING 'utf-8' CSV HEADER`, downloadSelect);
    await pool.query(json);
    await pool.query(csv);
    
    await pool.query(format(`DELETE FROM hotel WHERE hotelid=%s`, id));
    var response = {
        "status": "200 OK",
        "message": "Hotel with the provided id successfully deleted",
        "response": null
    };
    res.status(200).send(response);

});

apiRouter.use((req, res) => {
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

module.exports = apiRouter;