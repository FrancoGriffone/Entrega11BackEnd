import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import hbs from "express-handlebars";
import bCrypt from "bcrypt";
import mongoose from "mongoose";
import UsuariosSchema from "./src/models/usuariosModel.js";

import { Server as HttpServer } from 'http'
import { Server as Socket } from 'socket.io'

import addProductosHandlers from './src/routes/ws/productos.js'
import addMensajesHandlers from './src/routes/ws/mensajes.js'
import homeWebRouter from './src/routes/web/home.js'
import authWebRouter from './src/routes/web/auth.js'
import productosApiRouter from './src/routes/api/productos.js'



//passport imports
import passport from "passport";
import { Strategy } from "passport-local";

const localStrategy = Strategy;

const app = express();
const httpServer = new HttpServer(app)
const io = new Socket(httpServer)


//socket

io.on('connection', async socket => {
    //console.log('Nuevo cliente conectado!');
    addProductosHandlers(socket, io.sockets)
    addMensajesHandlers(socket, io.sockets)
});

//servidor

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'))

/*----------- Session -----------*/
app.use(cookieParser());
app.use(
	session({
		secret: "SECRETO",
		resave: false,
		saveUninitialized: false,
		cookie: {
			maxAge: 10000, //10 mins seg
		},
	})
);

//middlewares passport
app.use(passport.initialize());
app.use(passport.session());

//estrategias
passport.use(
	"register",
	new localStrategy(
		{ passReqToCallback: true },
		async (req, username, password, done) => {
			/*console.log("register", username + password);*/
			mongoose.connect(
				"mongodb+srv://FrancoGriffone:kaiin070@cluster0.okf5vxq.mongodb.net/Practico11?retryWrites=true&w=majority"
			);
			
			try {
				UsuariosSchema.create(
					{
						username,
						password: createHash(password),
						direccion: req.body.direccion,
					},
					(err, userWithId) => {
						if (err) {
							console.log(err)
							return done(err, null);
						}
						return done(null, userWithId);
					}
				);
			} catch (e) {
				return done(e, null);
			}
		}
	)
);

passport.use(
	"login",
	new localStrategy((username, password, done) => {
		mongoose.connect(
			"mongodb+srv://FrancoGriffone:kaiin070@cluster0.okf5vxq.mongodb.net/Practico11?retryWrites=true&w=majority"
		);
		try {
			UsuariosSchema.findOne(
				{
					username,
				
				},
				(err, user) => {
					if (err) {
						return done(err, null);
					}
					

					if (!user){
						return done(null, false)
					}

					if(!isValidPassword(user, password)){
						return done(null, false)
					}

					return done(null, user)
				}
			);
		} catch (e) {
			return done(e, null);
		}
	})
);

//serializar y deserializar

passport.serializeUser((usuario, done) => {
	console.log(usuario);
	done(null, usuario._id);
});

passport.deserializeUser((id, done) => {
	UsuariosSchema.findById(id, done);
});

//
function createHash(password) {
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function isValidPassword(user, password) {
	return bCrypt.compareSync(password, user.password);
}
   
// motor de vistas
app.set("views", "./src/views");

app.set('view engine', 'ejs');

app.engine(
	".hbs",
	hbs.engine({
		defaultLayout: "main",
		layoutsDir: "./src/views/layouts",
		extname: ".hbs",
	})
);
app.set("view engine", ".hbs");
//rutas
app.get("/login", (req, res) => {
	res.render("login");
});

app.post(
	"/login",
	passport.authenticate("login", {
		successRedirect: "/home",
		failureRedirect: "/login-error",
	})
);

app.get("/login-error", (req, res) => {
	res.render("login-error");
});

app.get("/registrar", (req, res) => {
	res.render("register");
});

/*app.get("/datos", (req, res) => {
	res.json({mensaje: 'sesion iniciada'});
});*/

app.post(
	"/registrar",
	passport.authenticate("register", {
		successRedirect: "/login",
		failureRedirect: "/login-error",
	})
);

// rutas del servidor web

app.use(homeWebRouter)
app.use(authWebRouter)

//productos vista

app.use(productosApiRouter)

//servidor
app.listen(8080, () => {
	console.log("Servidor levantado");
});
