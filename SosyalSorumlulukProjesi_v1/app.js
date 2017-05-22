var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var fs = require('fs');
var busboy = require('connect-busboy');
var fileUpload = require('express-fileupload');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/SSPdatabase');

var index = require('./routes/index');
var login = require('./routes/login');
var signup = require('./routes/signup');
var mainpage = require('./routes/mainpage');
var temsilcibilgileri = require('./routes/temsilcibilgileri');
var profile= require('./routes/profile');
var kullanicilar = require('./routes/kullanicilar');
var esyabilgileri = require('./routes/esyabilgileri');
var bagisistekleri = require('./routes/bagisistekleri');
var bagiscibilgileri = require('./routes/bagiscibilgileri');
var istek = require('./routes/istek');
var haziresyalar = require('./routes/haziresyalar');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(busboy());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'ssshhhhh', saveUninitialized: true , resave: true}));
app.use(fileUpload());

app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', index);
app.use('/login', login);
app.use('/signup', signup);
app.use('/mainpage', mainpage);
app.use('/temsilcibilgileri', temsilcibilgileri);
app.use('/profile', profile);
app.use('/kullanicilar', kullanicilar);
app.use('/bagisistekleri', bagisistekleri);
app.use('/esyabilgileri', esyabilgileri);
app.use('/bagiscibilgileri', bagiscibilgileri);
app.use('/istek', istek);
app.use('/haziresyalar', haziresyalar);

app.post('/loginprovider',function(req,res){
    var e_mail=req.body.email.trim();
    var password=req.body.password;

    var db = req.db;
    var users = db.get('users');
    users.find({"email":e_mail,"password":password}, function(err, result) {
        if (err) throw err;
        console.log(result);

        if(result.length > 0) {
            req.session.email = e_mail;
            req.session.loggedin = true;
            req.session.usertype = result[0].usertype;

            if (result[0].usertype === "temsilci" && result[0].signupstatus === "infoneeded") {
                req.session.infoneeded = true;
                res.redirect('/temsilcibilgileri');
            }
            else {
                req.session.infoneeded = false;
                res.redirect('/mainpage');
            }
        }
        else{
            res.redirect('/login');
        }
    });
});





app.post('/yenikullanici',function(req,res){
    var e_mail=req.body.email.trim();
    var password=req.body.password;
    var password2=req.body.password2;
    var userType=req.body.usertype;


    var db = req.db;
    var users = db.get('users');
    users.insert({"email":e_mail,"password":password,"usertype":userType, "signupstatus":"infoneeded"}, function(err, result) {
        if (err) throw err;

        if(userType === "temsilci"){
            req.session.email = e_mail;
            req.session.usertype = userType;
            req.session.loggedin = true;
            req.session.infoneeded = true;
            res.redirect('/temsilcibilgileri');
        }
        else {
            req.session.email = e_mail;
            req.session.usertype = userType;
            req.session.loggedin = true;
            req.session.infoneeded = true;
            console.log(userType,"-----------------------");
            res.redirect('/bagiscibilgileri');
        }
    });
});




app.post('/kullanicibilgileri',function(req,res){
    var e_mail=req.session.email;
    var userType=req.body.usertype;

    if(userType === "temsilci") {
        req.session.infoneeded = false;
        var db = req.db;
        var users = db.get('users');
        users.update({"email": e_mail}, {
            $set: {
                "signupstatus": "confirmneeded",
                "school": req.body.school,
                "name": req.body.name,
                "birthdate": req.body.birthdate,
                "address": {
                    "localaddress": req.body.address,
                    "district": req.body.district,
                    "city": req.body.city
                },
                "phone": req.body.phone
            }
        }, function (err, result) {
            if (err) throw err;

            req.session.infoneeded = false;
            res.redirect('/mainpage');
        });
    }
    else{ // bagisci

        var db = req.db;
        var users = db.get('users');
        users.update({"email": e_mail}, {
            $set: {
                "signupstatus": "confirmed",
                "name": req.body.name,
                "birthdate": req.body.birthdate,
                "address": {
                    "localaddress": req.body.address,
                    "district": req.body.district,
                    "city": req.body.city
                },
                "phone": req.body.phone
            }
        }, function (err, result) {
            if (err) throw err;

            req.session.infoneeded = false;
            res.redirect('/mainpage');
        });
    }


});

app.post('/kullanicilistesi',function(req,res){
    var db = req.db;
    var users = db.get('users');
    var kullanicilar = {};

    users.find({"usertype":"temsilci", "signupstatus":"confirmneeded"}, function(err, resultonayBekleyenTemsilciler) {
        if (err) throw err;

        kullanicilar.onayBekleyenTemsilciler = resultonayBekleyenTemsilciler;

        users.find({"usertype":"temsilci"}, function(err, resulttemsilciler) {
            if (err) throw err;

            kullanicilar.temsilciler = resulttemsilciler;

            users.find({"usertype":"bagisci"}, function(err, resultbagiscilar) {
                if (err) throw err;

                kullanicilar.bagiscilar = resultbagiscilar;

                users.find({"usertype":"admin"}, function(err, resultadminler) {
                    if (err) throw err;

                    kullanicilar.adminler = resultadminler;

                    console.log(kullanicilar);

                    res.send(kullanicilar);

                });

            });

        });

    });
});

app.post('/temsilcionayla',function(req,res){
    var db = req.db;
    var users = db.get('users');
    users.update({"_id": req.body.id}, {
        $set: {
            "signupstatus": "confirmed"
        }
    }, function (err, result) {
        if (err) throw err;

        res.send("success");
    });
});

app.post('/esyaSil',function(req,res){
    var db = req.db;
    var users = db.get('item');
    users.update({"_id": req.body.id}, {
        $set: {
            "signupstatus": "confirmed"
        }
    }, function (err, result) {
        if (err) throw err;

        res.send("success");
    });
});

app.post('/esyalarigetir',function(req,res){
    var db = req.db;
    var items = db.get('item');

    items.find({},function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.post('/yeniesyaekle',function(req,res){
    var db = req.db;
    var items = db.get('item');
    var itemType =req.body.itemType;
    var item =req.body.item;

    items.update({"itemType": itemType}, {
        $addToSet: {
            "itemList": item
        }},function(err, result) {
        if (err) throw err;
        res.redirect('/esyabilgileri');
    });
});

app.post('/yeniesyaturuekle',function(req,res){
    var db = req.db;
    var items = db.get('item');
    var itemType =req.body.itemType;

    items.insert({"itemType":itemType,"itemList":[]},function(err, result) {
        if (err) throw err;
        res.redirect('/esyabilgileri');
    });
});

app.post('/bagisisteklerinigetir',function(req,res){
    var db = req.db;
    var donationRequests = db.get('donationRequests');

    donationRequests.find({"status":"Aktif"},function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.post('/istekGetir',function(req,res){

    var requestID = req.body.requestID;

    var db = req.db;
    var donationRequests = db.get('donationRequests');

    donationRequests.find({"_id" :requestID},function(err, result) {
        if (err) throw err;

        console.log(requestID ,"---------------------------------------")
        res.render('istek', { username: req.session.email, donationDetail : result[0]});
    });
});

app.post('/yeniBagis',function(req,res){
    var itemType=req.body.itemType;
    var item=req.body.item;
    console.log("-----------------------------------------------------------------", item);
    var itemCount = req.body.requestedCount;

    var db = req.db;
    var currentTime = new Date();
    var donationRequests = db.get('donationRequests');
    var users = db.get('users');

    // donationRequests.insert({"date":currentTime,"status":"Aktif","user":req.session.email,"itemType":itemType, "item":item,"totalcount":itemCount.toString(), "donatedCount":0}, function(err, result) {
    //     if (err) throw err;
    // });

    users.find({"email":req.session.email}, function(err, result) {
        if (err) throw err;

        donationRequests.insert({"date":currentTime,"status":"Aktif","user":req.session.email,"itemType":itemType, "address":result[0].address,
            "item":item,"totalcount":itemCount.toString(), "donatedCount":0, "promisedCount":0}, function(err, result2) {
            if (err) throw err;

            res.redirect('/mainpage');

        });
    });
});

app.post('/bagisekle',function(req,res){
    var reqId=req.body.reqId;
    var donator = req.session.email;
    var donationCount = req.body.donationCount;
    console.log("-----------------------------------------------------------------", reqId);
    var db = req.db;
    var currentTime = new Date();
    var donations = db.get('donation');
    var donationRequests = db.get('donationRequests');
    var users = db.get('users');
    var notif = db.get('notifications');

    donationRequests.find({"_id":reqId}, function(err, result) {
        if (err) throw err;

        if(result.length > 0) {
                donations.insert({"requestId":reqId,"date":currentTime,"donationStatus":"Aktif",
                    "donator":donator, "donationCount":donationCount, "cargoInfo":"", "donationRequest":result[0]}, function(err, result3) {
                    if (err) throw err;

                    donationRequests.update({"_id":reqId}, { $set: {
                        "promisedCount": result[0].promisedCount+donationCount
                    }}, function(err, result4) {
                        if (err) throw err;
                        var notifMessage = " sizin isteğinize bir bağışta bulundu.";
                        notif.insert({"from":req.session.email, "to":result[0].user,"date":currentTime,
                            "notificationStatus":"unseen", "message": notifMessage}, function(err, result5) {
                            if (err) throw err;

                            res.redirect('/profile');
                        });
                    });
                });
        }
    });



    res.redirect('/profile');
});


app.post('/kullanicininbagislarinigetir',function(req,res) {
    var db = req.db;
    var donations = db.get('donation');

    donations.find({"donator": req.body.useremail}, function (err, result) {
        if (err) throw err;

        console.log(result.length);
        res.send(result);
    });
});

app.post('/kargobilgisiekle',function(req,res) {
    var db = req.db;
    var donations = db.get('donation');
    var notif = db.get('notifications');

    donations.findOneAndUpdate({"_id": req.body.bagisId}, { $set: {
        "cargoInfo": {"cargoCompany":req.body.cargoCompany,"trackingNo":req.body.trackingNo}
    }}, function (err, result) {
        if (err) throw err;

        var notifMessage = " bağışa ait kargo bilgisini girdi.";
        notif.insert({"from":req.session.email, "to":result.donationRequest.user,"date":currentTime,
            "notificationStatus":"unseen", "message": notifMessage}, function(err, result5) {
            if (err) throw err;
        });
    });
    res.redirect('/profile');
});

app.post('/esyayatalipol',function(req,res) {
    var db = req.db;
    var donatorItems = db.get('donatorItems');
    var notif = db.get('notifications');
    var currentTime = new Date();

    donatorItems.find({"_id": req.body.haziresyaid}, function (err, result) {
        if (err) throw err;

        var notifMessage = " elinizdeki eşyaya talip oldu: "+ result[0].itemCount +" adet " + result[0].itemName ;
        notif.insert({"from":req.session.email, "to":result[0].donator,"date":currentTime,
            "notificationStatus":"unseen", "message": notifMessage}, function(err, result5) {
            if (err) throw err;
            res.send("success");
        });
    });

});

app.post('/bagisiptal',function(req,res) {
    var db = req.db;
    var donations = db.get('donation');

    donations.update({"_id": req.body.id}, { $set: {
        "donationStatus": "iptal"
    }}, function (err, result) {
        if (err) throw err;
        res.redirect('/profile')
    });
});

app.post('/eldekiesyayiekle',function(req,res) {
    var db = req.db;
    var donatorItems = db.get('donatorItems');
    var currentTime = new Date();
    console.log("Uploading: xde");


    var img = req.files.foto;
    var filename = req.body.foto;

    img.mv(__dirname + '/public/images/' + img.name, function(err) {
        if (err)
            return res.status(500).send(err);

    });

    donatorItems.insert({"donator":req.session.email,"date":currentTime,"itemStatus":"Aktif",
         "itemCount":req.body.eldekiSayi, "remainingItemCount":req.body.eldekiSayi,  "itemType":req.body.itemType, "itemName":req.body.item, "imagePath":req.body.foto}, function(err, result3) {
        if (err) throw err;

            res.redirect('/mainpage');
    });

});

app.post('/haziresyalarigetir',function(req,res){
    var db = req.db;
    var donatorItems = db.get('donatorItems');

    donatorItems.find({"itemStatus":"Aktif"},function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.post('/bildirimlerial',function(req,res){
    var db = req.db;
    var notifications = db.get('notifications');

    notifications.find({"to":req.session.email,"notificationStatus":"unseen"},function(err, result) {
        if (err) throw err;
        console.log(result);
        res.send(result);
    });
});

app.post('/bildirimlerigorulduyap',function(req,res){
    var db = req.db;
    var notifications = db.get('notifications');

   res.send("success");
});

app.get('/logout',function(req,res){
    req.session.destroy();
    res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;