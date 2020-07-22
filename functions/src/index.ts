import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import * as express from 'express';
const cors = require('cors');


const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://firestore-latech.firebaseio.com"
});

const db = admin.firestore();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
    response.json({
        mensaje: 'Hola Mundo desde Funciones de Firebase!!!'
    });
});

export const clases = functions.https.onRequest( async(request, response) => {

    const claseRef = db.collection('clases');
    const docsSnap = await claseRef.get();
    const cursos = docsSnap.docs.map( doc => doc.data() );

    response.json( cursos );

});

// Express
const app = express();
app.use( cors({ origin: true }) );

/* Crear un usuario OK*/
app.post('/usuario', async(req, res) => {

    const data = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.nombre,
        typeuser: req.body.typeuser,
        id: req.body.email  /* el id al crear un usuario no viene en el req.body */
    };

    const usuarioRef  = db.collection('usuario');

    const usuarioSnap = await usuarioRef.get();
    const usuarios = usuarioSnap.docs.map( doc => doc.data() );

    let exist = false;

    usuarios.forEach( element => {
        if ( element.email === data.email ) {
            exist = true;
        }
    });
    if ( exist ) {
        res.json({
            ok: false,
            mensaje: 'Error, este correo ya existe!'
        });
    } else {
        await usuarioRef.doc(data.id).set(data)
        res.json({
            ok: true,
            mensaje: '¡Usuario creado con exito!'
         });
    }

});

/* Todos los usuarios OK*/
app.get('/usuarios', async(req, res) => {

    const usuariosRef  = db.collection('usuario');
    const userSnap = await usuariosRef.get();
    const usuarios   = userSnap.docs.map( doc => doc.data() );

    res.json( usuarios );

});

/* Todas las clases - OK*/
app.get('/clases', async(req, res) => {

    const claseRef = db.collection('clases');
    const claseSnap = await claseRef.get();
    const cursos = claseSnap.docs.map( doc => doc.data() );

    res.json( cursos );
});

/* Solo una clase segun id - OK*/
app.get('/clase/:id', async(req, res) => {

    const id = req.params.id;

    const claseRef = db.collection('clases').doc( id );
    await claseRef.get()
        .then(doc => {
            res.json(doc.data());
        });

});

/* Crear una clase - OK*/
app.post('/clases', async(req, res) => {

    const data = {
        id: req.body.id,
        name: req.body.name,
        desc: req.body.desc
    };

    const claseRef  = db.collection('clases');
    const claseSnap = await claseRef.get();
    const clase = claseSnap.docs.map( doc => doc.data() );

    // res.json( clase );
    let exist = false;

    clase.forEach( element => {
        if ( element.id === data.id ){
            exist = true;
        }
    });
    if (exist) {
        res.json({
            ok: false,
            mensaje: 'Error, ya existe una clase con este nombre!'
        });
    } else {
        await claseRef.doc(data.id).set(data);
        res.json({
            ok: true,
            mensaje: 'Clase creada con exito!'
        });
    }



    // res.json( claseSnap );
});

/* Actualizar tipo de usuario con id - OK*/
app.put('/usuario/:id', async(req, res) => {

    const data = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.nombre,
        typeuser: req.body.typeuser,
        id: req.body.id
    };

    const id = req.params.id;

    const usuarioRef = db.collection('usuario').doc( id );
    await usuarioRef.update({
        typeuser: data.typeuser
    });

    res.json({
        ok: true,
        mensaje: `El usuario ${ data.name } a sido actualizado`
    });
});

/* Para el login - OK */
app.post('/login', async(req, res) => {

    const data = {
        email: req.body.email,
        password: req.body.password,
    };

    const usuarioRef = db.collection('usuario');
    const usuarioSnap = await usuarioRef.get();
    const usuarios = usuarioSnap.docs.map( doc => doc.data() );

    let user: any;

    usuarios.forEach(element => {
        if( element.email === data.email && element.password === data.password ) {
            user = element;
        }
    });
    if(user){
        res.json({
            ok: true,
            data: user
        });
    } else {
        res.json({
            ok: false,
            mensaje: 'user y/o pass invalidos'
        });
    }
});

/* Actualizar una clase, segun id - OK */
app.put('/clase/:id', async(req, res) => {

    const data = {
        id: req.body.id,
        name: req.body.name,
        desc: req.body.desc
    };

    const id = req.params.id;

    const claseRef = db.collection('clases').doc( id );
    await claseRef.update({
        desc: data.desc,
        name: data.name
    });
    res.json({
        ok: true,
        mensaje: `La clase ${ data.name } a sido actualizada`
    });

});

/* Borrar una clases segun id */
app.delete('/clase/:id', async(req, res) => {

    const id = req.params.id;
    const idConcat = 'idclase.'+ id;
    let data: any;

    const claseRef = db.collection('clases').doc( id );
    await claseRef.delete();

    const subsRef = db.collection('subscritos');
    subsRef.where( idConcat, '==', true )
        .get()
        .then(snapshot => {
            snapshot.forEach(async(doc) => {
                data = doc.data();
                delete data.idclase[id];
                const subsRefTemp = db.collection('subscritos').doc( data.iduser );
                await subsRefTemp.update({
                    idclase: data.idclase
                });
            });
        });


    res.json({
        ok: true,
        mensaje: 'La clase fue borrada'
    });
});

/* Consultar clases Subscritas, por user id - OK!! */
app.get('/subs/:id', async(req, res) => {

    const id = req.params.id;

    let subsTemp: [] = [];

    const subsRef = db.collection('subscritos').doc( id );
    const subSnap = await subsRef.get();

    if ( !subSnap.exists ) {
        res.json({
            ok: false,
            mensaje: 'No estas subscrito a ninguna clase'
        });
    } else {
        await subsRef.get()
            .then(doc => {
                const data = doc.data() || {};
                subsTemp = data.idclase;
                res.json({
                    ok: true,
                    clases: subsTemp
                });
            });
    }
});

/* Subscribirse a una clase - OK!!*/
app.post('/subs', async(req, res) => {

    const data = {
        iduser: req.body.iduser,
        idclase: { [req.body.idclase]: true }
    };

    let dataTemp: any = null;

    const subsRef = db.collection('subscritos').doc( data.iduser );
    const subsSnap = await subsRef.get()

    if ( !subsSnap.exists ) {
        await db.collection('subscritos').doc( data.iduser ).set( data );
        res.json({
            ok: true,
            mensaje: 'Subscripcion realizada con exito!'
        });

    } else {
        await subsRef.get()
            .then( doc => {
                const subs = doc.data() || {};
                const clasesTemp =  Object.keys( subs.idclase || []);
                let exist = false;
                const newClaseTemp = Object.keys( data.idclase );
                clasesTemp.forEach( element => {
                    if ( element === newClaseTemp[0] ){
                        exist = true;
                    }
                });
                if (exist) {
                    res.json({
                        ok: false,
                        mensaje: 'Ya esta subscrito a esta clase'
                    });
                } else {
                    dataTemp = Object.assign({}, subs.idclase, data.idclase);
                }
            });
        if( dataTemp ){
            await subsRef.update({
                idclase: dataTemp
            });

            res.json({
                ok: true,
                mensaje: '¡Se ha subscrito a la clase!'
            });
        }
    }

});



export const api = functions.https.onRequest( app );
