const express = require('express');
const mysql = require('mysql2');
const bcryptjs = require('bcryptjs');
const mycoon = require('express-myconnection');
const cors = require('cors');
const cookieParse = require('cookie-parser')
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const sessions = require("express-session");
const cookieParser = require("cookie-parser");
const jwt = require('jsonwebtoken');


require('dotenv').config();

const app = express();
app.set('port', process.env.PORT || 3100);
app.use(express.json());
app.use(cors());
app.use(cookieParse());

// Configuracion con la base de datos
const dbOptions = {
    host: process.env.host_db,
    user: process.env.user_db,
    password: process.env.password_db,
    port: process.env.port_db,
    database: process.env.database_db
};

// Configuracion para el envio de correos
const shipmentEmail = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: process.env.user_email,
        pass: process.env.password_email
    }
})

// Conexion con la base de datos
try {
    app.use(mycoon(mysql, dbOptions, 'single'));
    console.log("Conectado a la base de datos");
} catch (error) {
    console.log('------------------- ERROR -------------------');
    console.log(error);
    console.log('---------------------------------------------');
}

// Conexion para el envio de los correos
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: '2022.flash.sale@gmail.com',
        pass: 'ynjzrmpxxxlnxapt',
    },
});

const timeExp = 1000 * 60 * 60;

// Configuracion para el manejo de sesiones
app.use(
    sessions({
        secret: "rfghf66a76ythggi87au7td",
        saveUninitialized: true,
        cookie: { maxAge: timeExp },
        resave: false,
    })
);


//RUTAS

// Ruta post que recibe los datos del registro
app.post('/registre', [
    body('document').exists().withMessage("Este campo debe de contener su numero de identidicacion")
        .isNumeric().withMessage("Este campo solo admite caracteres numericos")
        .isLength({ max: 12 }).withMessage("A agregado demaciado caracteres, el maximo son 12"),

    body('name').exists().withMessage("Este campo debe de contener su nombre")
        .isLength({ min: 3 }).withMessage("Este campo debe de contener al menos 3 caracteres")
        .isLength({ max: 50 }).withMessage("A agregado demaciado caracteres, el maximo son 50")
        .trim()
        .isString().withMessage("Este compo solo contiene texto"),

    body('email').exists().withMessage("Este campo debe de contener su correo")
        .isEmail().withMessage("El formato del correo no es valido")
        .isLength({ min: 3 }).withMessage("Este campo debe de contener al menos 3 caracteres")
        .isLength({ max: 50 }).withMessage("A agregado demaciado caracteres, el maximo son 50")
        .trim(),

    body('phone').exists().withMessage("Este campo debe de contener su telefono")
        .isLength({ min: 10 }).withMessage("El telefono debe de contener al menos 10 caracteres")
        .isLength({ max: 10 }).withMessage("A agregado demaciado caracteres, el maximo son 10")
        .isNumeric().withMessage("Este campo solo admite caracteres numericos")
        .trim(),

    // body('adress').exists().withMessage('Este campo debe de contener su dereccion')
    //     .isLength({ min: 3 }).withMessage("Este campo debe de contener al menos 3 caracteres")
    //     .isLength({ max: 50 }).withMessage("A agregado demaciado caracteres, el maximo son 50")
    //     .trim(),

    body('password').exists().withMessage("Este campo debe de contener su contraseña")
        .isLength({ min: 6 }).withMessage("La contraseña debe de contener al menos 6 caracteres")
        .trim(),

    // body('confirmPassword').exists().withMessage("Este campo debe de contener su contraseña")
    //     .isLength({ min: 6 }).withMessage("La contraseña debe de contener al menos 6 caracteres")
    //     .trim()
    //     .custom((value, { req }) => {
    //         if (value !== req.body.password) {
    //             throw new Error('Las contraseñas no coinciden');
    //         }
    //     })


],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const valores = req.body;
            const validaciones = errors.array();
            return res.status(400).send(validaciones);

        } else {

            let id = req.body.document;
            let user = req.body.name;
            let email = req.body.email;
            let adress = "debajo de un puente";
            let phone = req.body.phone;
            let password = req.body.password;
            let passwordHash = await bcryptjs.hash(password, 10);


            req.getConnection((err, conn) => {
                if (!err) {
                    conn.query('INSERT INTO customer set ?', [{
                        id_customer: id,
                        name_customer: user,
                        phone_number_admin: phone,
                        email_customer: email,
                        address_customer: adress,
                        pasword_customer: passwordHash,

                    }], (err, rows) => {
                        if (!err) {
                            console.log('------------------- REGISTRE -------------------');
                            console.log('usuario registrado');
                            console.log("------------------------------------------------");

                            transporter
                                .sendMail({
                                    from: '2022.flash.sale@gmail.com',
                                    to: email,
                                    subject: `Hola! ${user}`,
                                    html: `<h1>SU REGISTRO FUE EXITOSO</h1><br><p>Apreciado Usuario(a), el presente correo es para informar que ha sido registrado(a) correctamente en nuestro aplicativo web <b>FLASH sale</b> Esperamos que nuestra aplicación sea de su agrado y disfrute de todas las herramientas brindadas en esta web</p>`,
                                })
                                .then((res) => {
                                    console.log("------------------------");
                                    console.log("Email enviado");
                                    console.log("------------------------");
                                })
                                .catch((err) => {
                                    console.log("------------------------");
                                    console.log("Error al enviar el email");
                                    console.log(err);
                                    console.log("------------------------");

                                });
                            return res.status(200).
                                send({
                                    message: "Usuario registrado correctamente"
                                })


                        } else if (err.code == 'ER_DUP_ENTRY') {
                            console.log('------------------- ERROR REGISTRE DUPLICATE KEYS-------------------');
                            return res.status(500).send({
                                message: "El usuario ya existe"
                            });
                        } else {
                            console.log('------------------- ERROR REGISTRE-------------------');
                            return res.status(500).send({
                                message: err.message || "Error al crear el usuario"
                            });
                        }
                    })

                } else {
                    console.log('------------------- ERROR CONNECT-------------------');
                    return res.status(500).send({
                        message: err.message || "Error al conectar con la base de datos"
                    });
                }

            })
        }
    });

// Ruta post que reciebe los datos del login
app.post('/login', [
    body('email').isEmpty().withMessage("Este campo debe de contener su correo")
        .isEmail().withMessage("El formato del correo no es valido")
        .trim(),
    body('password').isEmpty().withMessage("Este campo debe de contener su contraseña")
        .isLength({ min: 8 }).withMessage("La contraseña debe de contener al menos 8 caracteres")
        .trim(),
], async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    req.getConnection((err, conn) => {
        if (!err) {
            conn.query('SELECT name_customer, pasword_customer FROM customer WHERE email_customer = ?', [email], (err, rows) => {
                if (!err) {
                    if (rows.length > 0) {
                        let user = rows[0];
                        let passwordHash = user.pasword_customer;
                        bcryptjs.compare(password, passwordHash, (err, result) => {
                            if (result) {
                                session = req.session;
                                session.email = email;
                                let tokenSecurity = jwt.sign({ "userEmail": email }, "token_de_seguridad")
                                console.log("Logeado");
                                return res.status(200).send({
                                    message: "Usuario logeado correctamente",
                                    token: tokenSecurity
                                });
                            } else {
                                return res.status(500).send({
                                    message: "La contraseña es incorrecta"
                                });
                            }
                        })
                    } else {
                        return res.status(500).send({
                            message: "El usuario no existe"
                        });
                    }
                } else {
                    return res.status(500).send({
                        message: "El usuario no existe"
                    });
                }
            })
        } else {
            return res.status(500).send({
                message: "Error al conectar con la base de datos"
            });
        }
    })

});

// Ruta get que cierra la sesion
app.get("/logOut", (req, res) => {
    session = req.session;
    if (session.email) {
        req.session.destroy();
        return res.redirect("/");
    }
    return res.send("No tiene sesion para cerrar");
});

// Ruta post que recibe los datos para el restablecimiento de la contraseña
app.post('/passwordResect', [
    body('email').isEmpty().withMessage("Este campo debe de contener su correo")
        .isEmail().withMessage("El formato del correo no es valido")
        .trim(),
], async (req, res) => {
    let email = req.body.email;
    req.getConnection((err, conn) => {
        if (!err) {
            conn.query("SELECT pasword_customer FROM customer WHERE email_customer = ?", [email], (err, res) => {
                if (!err) {
                    console.log('------------------- RESTABLECER PASSWORD-------------------');

                } else {
                    console.log('------------------- ERROR RESTABLECER PASSWORD-------------------');
                    return res.status(500).send({
                        message: "Error al restablecer la contraseña"
                    });
                }

                let newPassword = random();
                console.log(newPassword);
                req.getConnection((err, conn) => {
                    if (err) {
                        console.log("pailas");
                    } else {
                        console.log('vamos');
                        conn.query("UPDATE customer SET pasword_customer = ? WHERE email_customer = ?", [newPassword, email], (err, res) => {
                            if (!err) {
                                transporter
                                    .sendMail({
                                        from: '2022.flash.sale@gmail.com',
                                        to: email,
                                        subject: `Hola! ${email}`,
                                        html: `<h1>SU REGISTRO FUE EXITOSO</h1><br><p>Apreciado Usuario(a), el token es ${newPassword}`,
                                    })
                                    .then((res) => {
                                        console.log("------------------------");
                                        console.log("Email enviado");
                                        console.log("------------------------");
                                    })
                                    .catch((err) => {
                                        console.log("------------------------");
                                        console.log("Error al enviar el email");
                                        // console.log(err);
                                        console.log("------------------------");

                                    }
                                    );

                            } else {
                                console.log('------------------- ERROR RESTABLECER PASSWORD-------------------');
                                console.log(err);
                                return res.status(500).send({
                                    message: "Error al restablecer la contraseña"
                                });
                            }
                        })
                    }
                })

            })
        } else {
            console.log('------------------- ERROR RESTABLECER PASSWORD-------------------');
            return res.status(500).send({
                message: "Error al restablecer la contraseña"
            });
        }
    })

})


// Ruta en la que acaba de restablecer la contraseña
app.post('/passwordResectConfir', (req, res) => {
    let email = req.body.email;
    let code = req.body.code;
    let newPassword = req.body.newPassword;

    req.getConnection((err, conn) => {
        if (!err) {
            conn.query("SELECT pasword_customer FROM customer WHERE  = ?", [email], (err, row) => {
                if (!err) {
                    if (code == row[0]) {
                        req.getConnection((err, conn) => {
                            if (!err) {
                                conn.query("UPDATE customer SET pasword_customer = ? WHERE email_customer = ?", [newPassword, email], (err, res) => {
                                    if (!err) {

                                        return res.status(200).send({
                                            message: "Contraseña restablecida correctamente"
                                        });
                                    } else {
                                        return res.status(500).send({
                                            message: "Error al restablecer la contraseña"
                                        });
                                    }
                                })
                            } else {
                                return res.status(500).send({
                                    message: "Error al conectar con la base de datos",
                                    erro: err
                                });
                            }
                        })
                    }
                } else {
                    return res.status(500).send({
                        message: "Error al conectar con la base de datos"
                    });
                }
            })
        } else {
            return res.status(500).send({
                message: "Error al conectar con la base de datos"
            });
        }
    })
})


// Conprueba si existe un token, osea si el usuario ya inicio sesion
function ensureToken(req, res, next) {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(" ");
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }

}


// Ruta get que recibe el token y lo compara con el token de la sesion
app.get('/profile', ensureToken, (req, res) => {
    jwt.verify(req.token, "token_de_seguridad", (err, data) => {
        if (!err) {
            res.status(200).send({
                message: "Usuario logeado correctamente",
                token: data
            })
        } else {
            res.send("no diuuuu")
        }
    })
})



app.listen(app.set('port'), () => {
    console.log('Server on port', app.set('port'));
});



// funcion random
function random() {
    let code = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}