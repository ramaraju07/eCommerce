const port = 3000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const crypto = require("crypto");
app.use(express.json());
app.use(cors());

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://ramaraju:Ramu%400049@cluster0.k7roy.mongodb.net/eCom");

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Serve Static Files
app.use('/images', express.static('upload/images'));

// Product Schema
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

// User Schema
const Users = mongoose.model('Users', {
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Map,
        of: Number,
        default: {}
    },
    phoneNumber: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth_token');
    if (!token) {
        return res.status(401).send({ errors: "Please authenticate using a valid token" });
    }

    try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
    } catch (error) {
        res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
};

// OTP Verification Logic
const otpStore = {}; // Temporary in-memory store for OTPs

app.post('/send-otp', async (req, res) => {
    const { phoneNumber } = req.body;
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[phoneNumber] = otp;

    // Send OTP via SMS using Twilio
    const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');
    client.messages.create({
        body: `Your OTP code is ${otp}`,
        from: '+1234567890', // Twilio phone number
        to: phoneNumber
    }).then(() => {
        res.status(200).send({ message: 'OTP sent' });
    }).catch(err => {
        res.status(500).send({ error: 'Failed to send OTP' });
    });
});

app.post('/verify-otp', async (req, res) => {
    const { phoneNumber, otp } = req.body;
    if (otpStore[phoneNumber] === otp) {
        delete otpStore[phoneNumber]; // OTP verified, remove from store
        res.status(200).send({ message: 'OTP verified' });
    } else {
        res.status(400).send({ error: 'Invalid OTP' });
    }
});

// Send Order Details
app.post('/send-order-details', async (req, res) => {
    const { email, orderDetails } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-email-password'
        }
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Order Confirmation',
        text: `Order details: ${orderDetails}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send({ error: 'Failed to send email' });
        }
        res.status(200).send({ message: 'Order details sent' });
    });
});

app.post('/send-order-details-sms', async (req, res) => {
    const { phoneNumber, orderDetails } = req.body;

    const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');
    client.messages.create({
        body: `Order details: ${orderDetails}`,
        from: '+1234567890', // Twilio phone number
        to: phoneNumber
    }).then(() => {
        res.status(200).send({ message: 'Order details sent' });
    }).catch(err => {
        res.status(500).send({ error: 'Failed to send SMS' });
    });
});

// API Creation
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// Creating Upload Endpoint for Images
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Adding New Product Endpoint
app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find({});
        let id;
        if (products.length > 0) {
            let last_product = products.slice(-1)[0];
            id = last_product.id + 1;
        } else {
            id = 1;
        }

        if (!req.body.name || !req.body.image || !req.body.category || !req.body.new_price || !req.body.old_price) {
            return res.status(400).json({ success: false, errors: 'All fields are required' });
        }

        const product = new Product({
            id: id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });

        await product.save();
        res.json({
            success: true,
            name: req.body.name,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating API for deleting Products
app.post('/removeproduct', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        res.json({
            success: true,
            message: 'Product removed successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        res.send(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for new collections
app.get("/newcollections", async (req, res) => {
    try {
        let products = await Product.find({});
        let newcollection = products.slice(1).slice(-8);
        res.send(newcollection);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for popular women products
app.get("/popularinwomen", async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        let popular_in_women = products.slice(0, 4);
        res.send(popular_in_women);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating Endpoint for registering user
app.post("/signup", async (req, res) => {
    try {
        if (!req.body.name || !req.body.email || !req.body.password) {
            return res.status(400).json({ success: false, errors: 'All fields are required' });
        }

        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: 'Existing user found with same email id' });
        }

        const user = new Users({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            cartData: {},
            phoneNumber: req.body.phoneNumber, // Store phone number
        });

        await user.save();

        const data = {
            user: {
                id: user.id,
            }
        };

        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating Endpoint for login
app.post("/login", async (req, res) => {
    try {
        const user = await Users.findOne({ email: req.body.email });
        if (user) {
            let password = user.password === req.body.password;
            if (password) {
                const data = {
                    user: {
                        id: user.id,
                    }
                };

                const token = jwt.sign(data, "secret_ecom");
                res.json({ success: true, token });
            } else {
                res.json({ success: false, errors: "Wrong password" });
            }
        } else {
            res.json({ success: false, errors: "Wrong email id" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for adding products to cart
app.post('/addtocart', fetchUser, async (req, res) => {
    try {
        const { itemId } = req.body;
        let userData = await Users.findById(req.user.id);
        if (userData) {
            userData.cartData[itemId] = (userData.cartData[itemId] || 0) + 1;
            await userData.save();
            res.json({ success: true, message: "Item added to cart" });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for removing products from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        const { itemId } = req.body;
        let userData = await Users.findById(req.user.id);
        if (userData) {
            if (userData.cartData[itemId] > 0) {
                userData.cartData[itemId] -= 1;
                if (userData.cartData[itemId] === 0) {
                    delete userData.cartData[itemId];
                }
                await userData.save();
                res.json({ success: true, message: "Item removed from cart" });
            } else {
                res.status(400).json({ success: false, message: "Item not in cart" });
            }
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for getting cart items
app.post('/getcart', fetchUser, async (req, res) => {
    try {
        let userData = await Users.findById(req.user.id);
        if (userData) {
            res.json({ success: true, cartData: userData.cartData });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Creating endpoint for updating cart items
app.post('/updatecart', fetchUser, async (req, res) => {
    const userId = req.user.id;
    const { cartItems } = req.body;

    try {
        const user = await Users.findById(userId);
        if (user) {
            user.cartData = cartItems;
            await user.save();
            res.json({ success: true, message: 'Cart updated successfully' });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the Server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port " + port);
    } else {
        console.log("Error: " + error);
    }
});
