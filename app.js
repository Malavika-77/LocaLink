const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');
const { engine } = require('express-handlebars');
const touristRoutes = require('./views/routes/tourist');
const app = express();
const JWT_SECRET = 'travel@2020'; // You should store this in environment variables

// MongoDB Connection
mongoose.connect('mongodb+srv://webpixelsprojects:YGc3VFFksa86uzDx@projects.v6tqawl.mongodb.net/?retryWrites=true&w=majority&appName=projects', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);



// Define schema and model
const reviewSchema = new mongoose.Schema({
  email: String,
  country: String,
  place: String,
  image: String,
  review: String,
  rating: Number
});
const Review = mongoose.model('Review', reviewSchema);


// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For parsing application/json

// Handlebars Middleware
app.engine('hbs', engine({
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));


// Routes
app.use('/api/tourist', touristRoutes);


// Routes
app.get('/Login', (req, res) => {
  res.render('auth/login', {
    layout: 'main',
    noFooter: true,
    hidehomeLink: true,
    
   
  });
});


// Get Started route
app.get('/getstarted', (req, res) => {
  res.render('getstarted', {
    layout: 'main',
    noFooter: true,
    hidehomeLink: true,
});
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      
      return res.status(400).send('Email does not exist.');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      
      return res.status(400).send('Invalid password.');
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // 1 hour
    console.log('Login successful.');
    
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Server error.');
  }
});

app.get('/Signup', (req, res) => {
  res.render('auth/signup', {
    layout: 'main',
    noFooter: true,
    hidehomeLink: true,
  });
});

app.post('/signup', async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  const passwordRegex = /^(?=.*\d)(?=.*[A-Z]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).send('Password must be at least 8 characters long, contain at least one uppercase letter, and at least one digit.');
  }

  if (password !== confirmPassword) {
   
    return res.status(400).send('Passwords do not match.');
    
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('Email already in use.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();
    console.log('User registered successfully.');
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Server error.');
  }
});

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send('Invalid token.');
  }
};

// Example of a protected route
app.get('/protected', authenticateToken, (req, res) => {
  res.send('This is a protected route.');
});

// Sign out route
app.post('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the cookie
  res.redirect('/'); // Redirect to the login page
});

// Route to serve the add review page

app.post('/api/review', async (req, res) => {
  try {
    const review = new Review(req.body);
    await review.save();
    res.status(201).send('Review saved.');
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).send('Error saving review.');
  }
});

app.get('/api/latest-reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ _id: -1 }) // Sort by `_id` in descending order
      .limit(4); // Limit to the latest 4 reviews
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});



app.post('/api/update-review', async (req, res) => {
  const { email, place, review, rating } = req.body;

  try {
    // Step 1: Check if the email exists
    const existingReview = await Review.findOne({ email, place });

    if (!existingReview) {
      // Step 2: If no review found with the provided email and place
      return res.status(404).json({ success: false, message: 'Review not found for the given email and place' });
    }

    // Step 3: Update the review if the email and place match
    const updatedReview = await Review.findOneAndUpdate(
      { email, place },
      { review, rating },
      { new: true } // Return the updated document
    );

    if (updatedReview) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Failed to update review' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update server review' });
  }
});



// Home Route
app.get('/', (req, res) => {
  const token = req.cookies.token;
  const isLoggedIn = !!token; // Check if there is a token

  res.render('home', {
    title: 'Home - Local Experience Finder',
    isLoggedIn: isLoggedIn // Pass the login status to the template
  });
});

/// delete route
app.post('/api/delete-review', async (req, res) => {
  const { email, place } = req.body;

  console.log('Received delete request:', { email, place });

  if (!email || !place) {
    console.log('Missing email or place');
    return res.status(400).json({ success: false, message: 'Email and place are required.' });
  }

  try {
    const result = await Review.deleteOne({ email, place });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Error deleting review.' });
  }
});

//the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
