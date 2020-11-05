const express= require("express");
const app=express();
const fs= require("fs");
const mongoose = require('mongoose') 
const imgModel = require('./model');
const multer=require("multer");
const { createWorker }= require("tesseract.js");
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const worker = createWorker({
    logger: m => console.log(m)
  });

const storage=multer.diskStorage({
    destination :(req,file,cb)=>{
     cb(null,"./uploads");
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname);
       }
});
var conn_cb=function(err){
    if(err)console.log(err);
    else console.log("Connection opened");
};
const upload = multer({storage:storage}).single("avatar");
app.set('view engine','ejs');
mongoose.connect("mongodb://localhost:27017/ocr_data",conn_cb);

app.get('/uploads',(req,res)=>{
 res.render('index');
})
app.get('/repos',(req,res)=>{
    imgModel.find({}, (err, items) => { 
        if (err) { 
            console.log(err); 
        } 
        else { 
            res.render('home', { items: items }); 
        } 
    }); 
})

app.post('/repos',(req,res)=>{
    console.log(`/${req.body.search}/i`);
    var query = { "desc": `/${req.body.search}/i` };
    imgModel.find({ "desc": { "$regex": req.body.search, "$options": "i" } }, (err, items) => { 
        if (err) { 
            console.log(err); 
        } 
        else { 
            res.render('home', { items: items }); 
        } 
    }); 
})

app.locals.myVar=1;
app.post('/uploads',(req,res)=>{
    upload(req,res,err=>{
        fs.readFile(`./uploads/${req.file.originalname}`,(err,data)=>{          
            if(err){
              return console.log(err)
            }
            (async () => {
                await worker.load();
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                let { data: { text } } = await worker.recognize(data);
                console.log(text);
                app.locals.myVar=text;
                let { data2 } = await worker.getPDF('Tesseract OCR Result');
                fs.writeFileSync('tesseract-ocr-result.pdf', Buffer.from(data));
                console.log('Generate PDF: tesseract-ocr-result.pdf');
                await worker.terminate();
                const obj = { 
                    name: req.file.originalname, 
                    desc:text, 
                    img: { 
                        data: fs.readFileSync(`./uploads/${req.file.originalname}`), 
                        contentType: 'image/png'
                    } 
                } 
                imgModel.create(obj, (err, item) => { 
                    if (err) { 
                        console.log(err); 
                    } 
                    else { 
                        // item.save(); 
                        res.render('index',{ocr_data:app.locals.myVar});
                    } 
                });               
              })();
                
              
        })
    })
    
  })

app.listen(3000,()=>{
    console.log("Started");
})