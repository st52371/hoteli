
const express = require('express');
const fs = require('fs');
const app = express();
const {Pool} = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost', //?????
    database: 'hoteli',
    password: '16028400',
    port: 5432  // zasto 5432
});

app.set('view engine', 'ejs');
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));


const veliki = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid`;
// const mali = `select * from hotel where hotelid=$1`;
const attributes = ['naziv', 'adresa', 'grad', 'zupanija', 'drzava', 'brojzvjezdica', 'googlerating', 'bookingrating', 'trivagorating', 'weburl', 'telefon', 'email'];
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
app.get('/download', (req, res) => {
    // fs.writeFile('hoteli.txt', 'buuu');
    // console.log(req.body.format);
    res.download('aaaaaaaaaaaa.txt')
});

app.get('/', async (req, res) => {
    // const results = await pool.query(mali, [1]);
    const results = await pool.query(veliki);

    // res.status(200).json({message: 'bla'});
    // res.download();
    // res.send('Hi');
    
    res.render('datatable', {
        text: 'world',
        rows: results.rows,
        attributes: attributes,
        attributes2: attributes2
    });
});

app.post('/', async (req, res) => {

    const searchattr = req.body.searchattr;
    console.log(searchattr);
    // nisu postavljeni parametri nikakvi
    if (!req.body.searchterm && !req.body.searchattr) {
        var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid`;
        var result = await pool.query(sqlic);
        // var naredba = `COPY ($1) TO 'D:\or\labosi\lab2\hoteli.csv' DELIMITER ',' ENCODING 'utf-8' CSV HEADER`;
        // await pool.query(naredba, [sqlic]);
    
    // postavljen je samo parametar vrijednosti
    } else if (!req.body.searchattr) {
        // broj je
        if (!isNaN(req.body.searchterm)) {
            const searchterm = parseFloat(req.body.searchterm);
            let search = `cast(hotel.brojzvjezdica as double precision)=$1 or ratings.googlerating=$1 or ratings.bookingrating=$1 or ratings.trivagorating=$1`
            var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE ` + search;
            var result = await pool.query(sqlic, [searchterm]);
        // rijec je
        } else {
            console.log('rijec je')
            const searchterm = `%` + req.body.searchterm + `%`;
            console.log('searchterm ', searchterm)
            let search = `hotel.naziv like $1 or ulice.nazivulice like $1 or gradovi.nazivgrada like $1 or zupanije.nazivzupanije like $1 or drzave.nazivdrzave like $1 or hotel.weburl like $1 or kontakt.email like $1`;
            var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE ` + search;
            var result = await pool.query(sqlic, [searchterm]);
        }
    // postavljena su oba parametra
    } else {
        // odabrana je adresa
        if (searchattr === 'adresa') {
            // trazim rijeci u adresi
            if (isNaN(req.body.searchterm)) {
                const searchterm = '%' + req.body.searchterm + '%';
                let search = `ulice.nazivulice like $1`;
                var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE ` + search;
                var result = await pool.query(sqlic, [searchterm]);
            // trazim broj u adresi
            } else {
                // SAMO AKO JE TOCNO TAJ BROJ A NE DA GA CONTAINA
                const searchterm = req.body.searchterm;
                var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE adrese.broj=$1`;
                var result = await pool.query(sqlic, [searchterm]);
            }
        // odabran je broj atribut
        } else if (isNum(searchattr)) {
            var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE ` + searchattr + `=$1`;
            const searchterm = req.body.searchterm;
            var result = await pool.query(sqlic, [searchterm]);

        // odabran je rijec atribut
        } else {
            var sqlic = `SELECT hotel.naziv, ulice.nazivulice || ' ' || adrese.broj::TEXT || CASE WHEN adrese.dodatnaoznaka IS NULL THEN '' ELSE adrese.dodatnaoznaka END AS adresa, gradovi.nazivgrada AS grad, zupanije.nazivzupanije AS zupanija,drzave.nazivdrzave AS drzava,hotel.brojzvjezdica, ratings.googlerating AS googlerating, ratings.bookingrating AS bookingrating, ratings.trivagorating AS trivagorating, hotel.weburl,kontakt.brojtelefona AS telefon,kontakt.email AS email FROM hotel LEFT JOIN adrese ON hotel.adresaid = adrese.adresaid NATURAL JOIN ulice NATURAL JOIN gradovi NATURAL JOIN zupanije NATURAL JOIN drzave LEFT JOIN ratings ON hotel.ratingid = ratings.ratingid LEFT JOIN kontakt ON hotel.kontaktid = kontakt.kontaktid WHERE ` + searchattr + ` like $1`;
            const searchterm = '%' + req.body.searchterm + '%';
            var result = await pool.query(sqlic, [searchterm]);
        }
    }

    const results = result;
    
    // console.log(results.rows);
    // console.table(results.rows);
    // console.log('file?')
    await fs.writeFile('aaaaaaaaaaaa.txt', 'buuuu', (err) => {if (err) throw err;});
    res.render('datatable', {
        text: 'world',
        rows: results.rows,
        attributes: attributes,
        attributes2: attributes2
    });
  


});

function isNum(num) {
    if (num === 'hotel.brojzvjezdica' ||
        num === 'ratings.googlerating' ||
        num === 'ratings.bookingrating' ||
        num === 'ratings.trigavorating')
        return true;
    else
        return false;
}

app.listen(3000);