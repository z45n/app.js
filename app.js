const express = require('express');
const app = express();
const port = 3000;
const ejs = require('ejs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const session = require('express-session');
const { Web3 } = require('web3');
const path = require('path');
const fileUpload = require('express-fileupload');
const bcrypt = require('bcrypt');
const secretKey = process.env.SECRET_KEY || 'defaultSecretKey';

console.log('My secret key:', secretKey);

// The rest of your code goes here...


app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to your Ethereum node (Ganache)
const web3 = new Web3('http://127.0.0.1:7545');

// Check connection
web3.eth.net.isListening()
  .then(() => console.log('Connected to Ethereum node'))
  .catch(err => console.error('Error connecting to Ethereum node:', err));

// Contract addresses
const userAuthContractAddress = '0x30C277efE70b1ae821b4f432d0F449958168258E';
const databaseContractAddress = '0x2df8873fefbeC8c399263B14cB4378675EbDB0bC';
const userProfileContractAddress = '0x4953061C8842E4B17E47b800eD8FF4c8e1a3b3F2';

// Load UserAuthentication contract ABI
const contractPathUserAuth = path.join(__dirname, '..', 'truffle-nodejs', 'build', 'contracts', 'UserAuthentication.json');
const contractDataUserAuth = require(contractPathUserAuth);
const contractABIUserAuth = contractDataUserAuth.abi;


// Load Database contract ABI
const contractPathDatabase = path.join(__dirname, '..', 'truffle-nodejs', 'build', 'contracts', 'Database.json');
const contractDataDatabase = require(contractPathDatabase);
const contractABIDatabase = contractDataDatabase.abi;


// Load UserProfile contract ABI
const contractPathUserProfile = path.join(__dirname, '..', 'truffle-nodejs', 'build', 'contracts', 'UserProfile.json');
const contractDataUserProfile = require(contractPathUserProfile);
const contractABIUserProfile = contractDataUserProfile.abi;


// Instantiate contract instances after initializing web3
const userAuthContractInstance = new web3.eth.Contract(contractABIUserAuth, userAuthContractAddress);
const databaseContractInstance = new web3.eth.Contract(contractABIDatabase, databaseContractAddress);
const userProfileContractInstance = new web3.eth.Contract(contractABIUserProfile, userProfileContractAddress);


// Initialize session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));


app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const registeredUsers = [];
const usersWith2FA = new Map();


app.get('/', async (req, res) => {
  try {
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEther = web3.utils.fromWei(balanceWei, 'ether');
    console.log('Accounts:', accounts);
    console.log('Balance (Wei):', balanceWei);
    console.log('Balance (Ether):', balanceEther);
    res.render('home', { ethBalance: balanceEther });
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error);
    res.render('home', { ethBalance: 'Error fetching balance' });
  }
});


app.get('/signup', (req, res) => {
  res.render('signup'); 
});



app.post('/set-value', async (req, res) => {
  const { key, value } = req.body;

  // Send a transaction to the smart contract to set a value
  await userAuthContractInstance.methods.setValue(key, value)
    .send({ from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A', gas: 200000 })
    .then(receipt => {
      console.log('Transaction receipt:', receipt);
      res.redirect('/'); // Redirect to the main page after setting the value
    })
    .catch(err => {
      console.error('Error setting value:', err);
      res.status(500).send('Error setting value');
    });
});




app.post('/register', async (req, res) => {
  const { username, password, cpassword } = req.body;

  console.log('Username:', username);
  console.log('Password:', password);
  console.log('Confirm Password:', cpassword);

  // Check if passwords match
  if (password !== cpassword) {
    res.send('Passwords do not match');
    return;
  }

  try {
    // Check if the username is unique on the blockchain
    const isUsernameTaken = await userAuthContractInstance.methods.isUsernameTaken(username).call();
    if (isUsernameTaken) {
      res.send('Username is already taken');
      return;
    }

    // Hash the password for security using bcrypt
    const hashedPassword = await hashPassword(password);

    // Store the hashed password in the Database contract
    const receiptStorePasswordHash = await databaseContractInstance.methods
      .registerUser(username, hashedPassword)
      .send({
        from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A',
        gas: 200000,
      });

    // Check if the transaction failed
    if (!receiptStorePasswordHash.status) {
      console.error('Transaction failed:', receiptStorePasswordHash);
      res.send('Transaction failed');
      return;
    }

    // Register user in the UserAuthentication contract
    const receiptRegisterUser = await userAuthContractInstance.methods
      .registerUser(username, hashedPassword)
      .send({
        from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A',
        gas: 200000,
      });

    // Check if the transaction failed
    if (!receiptRegisterUser.status) {
      console.error('Transaction failed:', receiptRegisterUser);
      res.send('Transaction failed');
      return;
    }

    const hashCodeGenResponse = await userAuthContractInstance.methods
    .generateHashCode(username)
    .send({
        from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A',
        gas: 200000, // Add gas value based on your contract needs
    })
    .on('transactionHash', (hash) => {
        console.log('Transaction Hash:', hash);
    })
    .on('receipt', (receipt) => {
        if (receipt.status) {
            console.log('Hash Code Generated Successfully');
        } else {
            console.error('Hash Code Generation Failed');
        }
    });





    // Check if the transaction failed
    if (!hashCodeGenResponse.status) {
      console.error('Transaction failed:', hashCodeGenResponse);
      res.send('Transaction failed');
      return;
    }

    const generatedHashCode = hashCodeGenResponse.events.HashCodeGenerated.returnValues.hashCode;

    // Set user information in the session
    req.session.user = { username, hashedPassword };
    req.session.generatedHashCode = generatedHashCode;

    // Redirect to signin page
    res.redirect('/signin');
  } catch (error) {
    console.error('Error registering user:', error);
    res.send('Error registering user');
  }
});





app.post('/generate-hash', async (req, res) => {
  try {
    const { username } = req.session.user;

    // Call the generateHashCode function in your smart contract
    await contractInstance.methods.generateHashCode(username).send({
      from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A', 
      gas: 200000
    });

    res.redirect('/'); 
  } catch (error) {
    console.error('Error generating hash code:', error);
    res.send('Error generating hash code');
  }
});

// Function to hash passwords using bcrypt
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};


const generateHashCode = async (username) => {
  try {
    console.log('Generating hash code for username:', username);

    // Check if the hash code already exists for the username
    const existingHashCode = await userAuthContractInstance.methods.userHashCodes(username).call();
    if (existingHashCode) {
      console.log('Hash code already exists for the username:', existingHashCode);
      return existingHashCode;
    }

    const hashCodeGenResponse = await userAuthContractInstance.methods
    .generateHashCode(username)
    .send({
        from: '0x3cE3237B7fAa4E90BfEcb1A5a2191BA9a2EFf60A',
        gas: 200000, // Add gas value based on your contract needs
    })
    .on('transactionHash', (hash) => {
        console.log('Transaction Hash:', hash);
    })
    .on('receipt', (receipt) => {
        if (receipt.status) {
            console.log('Hash Code Generated Successfully');
        } else {
            console.error('Hash Code Generation Failed');
        }
    });




    // Check if the transaction failed
    if (!hashCodeGenResponse) {
      console.error('Transaction failed:', hashCodeGenResponse);
      return null;
    }

    const generatedHashCode = hashCodeGenResponse;
    console.log('Generated hash code:', generatedHashCode);

    return generatedHashCode;
  } catch (error) {
    console.error('Error in generateHashCode:', error);
    return null;
  }
};



app.get('/signin', async (req, res) => {
  try {
    // Check if a user is already authenticated
    if (req.session.user && req.session.user.username) {
      const generatedHashCode = await userAuthContractInstance.methods.generateHashCode(req.session.user.username).call();
      return res.render('signin', { generatedHashCode });
    }

    // If not authenticated or username is not defined, proceed without a username
    const generatedHashCode = ''; // Set a default value if needed
    req.session.generatedHashCode = generatedHashCode;
    res.render('signin', { generatedHashCode });
  } catch (error) {
    console.error('Error during signin route:', error);
    res.send('Error during signin route');
  }
});






app.post('/signin', async (req, res) => {
  const { username, password, otp } = req.body;

  try {
    // Check if the user exists on the blockchain
    const isUserExists = await userAuthContractInstance.methods.isUsernameTaken(username).call();
    if (!isUserExists) {
      res.send('User does not exist. Please check your credentials.');
      return;
    }

    // Get the stored hash code from the smart contract
    const storedHashCode = await userAuthContractInstance.methods.getGeneratedHashCode(username).call();

    // Check if the entered password matches the stored hash code
    const isHashCodeValid = storedHashCode === req.body.hashCode;
    if (!isHashCodeValid) {
      res.send('Invalid hash code. Please try again.');
      return;
    }

    if (usersWith2FA.has(username)) {
      const secret = usersWith2FA.get(username);

      // Add the TOTP verification code here
      const is2faValid = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: otp,
        window: 4, // Allow for a larger time window
      });

      if (is2faValid) {
        // User provided a valid 2FA code
        const generatedHashCode = storedHashCode || ''; // Set a default value if not present
        res.locals.generatedHashCode = generatedHashCode;
        res.render('signin', { generatedHashCode }); // Render the sign-in page with the generated hash code
      } else {
        // User provided an invalid 2FA code
        // Handle the case where the 2FA code is incorrect
        res.send('Invalid 2FA code. Please try again.');
      }
    } else {
      // No 2FA for this user
      const generatedHashCode = storedHashCode || ''; // Set a default value if not present
      res.locals.generatedHashCode = generatedHashCode;

      // Your existing code for handling sign-in without 2FA
      // ...

      // Redirect to home2.ejs upon successful sign-in
      res.redirect('/home2');
    }
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.send('Error during sign-in');
  }
});




app.post('/submit-signin', async (req, res) => {
  const { username, password, otp } = req.body;

  try {
    // Your existing code for user authentication and password validation

    // Check if the user has 2FA enabled
    if (usersWith2FA.has(username)) {
      // Your existing code for handling 2FA

      // Render the sign-in page with the generated hash code
      res.render('signin', { generatedHashCode: req.session.generatedHashCode });
    } else {
      // No 2FA for this user
      const generatedHashCode = req.session.generatedHashCode || ''; // Set a default value if not present
      res.render('signin', { generatedHashCode }); // Render the sign-in page with the generated hash code
    }
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.send('Error during sign-in');
  }
});

app.get('/home2', async (req, res) => {
  try {
    // Check if the user is authenticated (you may need to enhance this based on your session handling)
    if (!req.session.user) {
      res.redirect('/signin'); // Redirect to the sign-in page if not authenticated
      return;
    }

    // Fetch Ethereum balance for the user from Ganache
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEther = web3.utils.fromWei(balanceWei, 'ether');

    // Render the home2 page with the Ethereum balance
    res.render('home2', { ethBalance: balanceEther });
  } catch (error) {
    console.error('Error fetching Ethereum balance:', error);
    res.render('home2', { ethBalance: 'Error fetching balance' });
  }
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = registeredUsers.find((u) => u.name === username && u.password === password);

  if (user) {
    req.session.user = { username: username };
    res.redirect('/home2');
  } else {
    res.send('Invalid login credentials');
  }

  // Set a default value for generatedHashCode
  const generatedHashCode = req.session.generatedHashCode || '';
  
  // Render the sign-in page with the generated hash code
  res.render('signin', { generatedHashCode });
});



app.get('/home', (req, res) => {
  // Handle logic for home route, e.g., rendering a page or redirecting
  res.render('home'); // Adjust based on your application's structure
});


app.get('/registered-users', (req, res) => {
  res.render('registered-users', { users: registeredUsers });
});

app.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/'); // Redirect to the home page after signing out
  });
});


app.get('/enable-2fa', (req, res) => {
  // Check if the user is logged in and if you have the user's information in the session
  if (!req.session.user) {
    res.send('You must be logged in to enable 2FA.'); // Handle cases where the user is not logged in
    return;
  }

  const username = req.session.user.username; // Retrieve the username from the session
  const secret = speakeasy.generateSecret({ length: 20, name: username });

  // Store the secret associated with the user
  usersWith2FA.set(username, secret);

  // Generate the OTP provisioning URL and QR code
  const otpAuthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: 'YourApp',
    issuer: 'YourApp',
  });

  // Generate the QR code as a data URI
  qrcode.toDataURL(otpAuthUrl, (err, imageUrl) => {
    if (err) {
      console.error('Error generating QR code:', err);
      res.send('Error generating QR code');
    } else {
      console.log('QR Code Image URL:', imageUrl);
      res.render('enable-2fa', { name: username, imageUrl: imageUrl, expectedCode: secret.base32 });
    }
  });
});

app.post('/enable-2fa', (req, res) => {
  // Check if the user is logged in and has a valid session
  if (!req.session.user) {
    res.send('You must be logged in to enable 2FA.'); // Handle cases where the user is not logged in
    return;
  }

  const { username } = req.session.user;
  const secret = speakeasy.generateSecret({ length: 20, name: username });

  // Store the secret associated with the user
  usersWith2FA.set(username, secret);

  // Generate the OTP provisioning URL and QR code
  const otpAuthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: 'YourApp',
    issuer: 'YourApp',
  });

  qrcode.toDataURL(otpAuthUrl, (err, imageUrl) => {
    if (err) {
      console.error('Error generating QR code:', err);
      res.send('Error generating QR code');
    } else {
      console.log('QR Code Image URL:', imageUrl);

      
      res.render('enable-2fa', { name: username, imageUrl: imageUrl, expectedCode: secret.base32 });

      
      res.redirect('/home2');
    }
  });
});



// Function to generate a random 4-digit ID number
const generateIDNumber = () => {
  const min = 1000;
  const max = 9999;
  return Math.floor(Math.random() * (max - min + 1) + min);
};



async function processTransactionOnChain() {
  const accounts = await web3.eth.getAccounts();
  const userAuthContractInstance = new web3.eth.Contract(contractABIUserAuth, userAuthContractAddress);

  try {
    const result = await userAuthContractInstance.methods.processTransaction().send({
      from: accounts[0],
      value: web3.utils.toWei('0.1', 'ether'), // Sending 0.1 ETH (including the 0.01 ETH fee)
      gas: 200000,
    });

    console.log('Transaction processed successfully:', result);
    // Continue with other form submission logic
  } catch (error) {
    console.error('Error processing transaction:', error);
    // Handle error
  }
}

app.post('/submit-profile', async (req, res) => {
  if (!req.session.user) {
    res.send('You must be logged in to upload your profile.');
    return;
  }

  const { fname, lname, email } = req.body;

  // Use the generateIDNumber function to generate the ID
  const ID = generateIDNumber();

  if (!fname || !lname || !email) {
    return res.redirect('/profile?error=validation');
  }

  if (req.files && req.files.document) {
    const document = req.files.document;

    req.session.user.fname = fname;
    req.session.user.lname = lname;
    req.session.user.email = email;
    req.session.user.ID = ID;
    req.session.user.document = `/uploads/${document.name}`;

    const uploadPath = path.join(__dirname, 'public', 'uploads', document.name);

    document.mv(uploadPath, async (err) => {
      if (err) {
        return res.redirect('/profile?error=document-upload');
      }

      // Handle successful profile update
      await updateProfileOnChain(fname, lname, email, ID, `/uploads/${document.name}`);

      res.redirect('/profile');
    });
  } else {
    req.session.user.fname = fname;
    req.session.user.lname = lname;
    req.session.user.email = email;
    req.session.user.ID = ID;
    req.session.user.document = null;

    // Handle successful profile update
    await updateProfileOnChain(fname, lname, email, ID, null);

    res.redirect('/profile');
  }
});




app.get('/profile', async (req, res) => {
  if (!req.session.user) {
    res.send('You must be logged in to see your profile.');
    return;
  }

  if (req.session.user && req.session.user.username) {
    // Retrieve user data from the blockchain
    const userData = await getUserDataFromChain();

    // Update the session user object with the retrieved data
    req.session.user.fname = userData.fname;
    req.session.user.lname = userData.lname;
    req.session.user.email = userData.email;
    req.session.user.ID = userData.ID;
    req.session.user.document = userData.document;

    res.render('profile', { user: req.session.user });
  }
});

async function updateProfileOnChain(fname, lname, email, ID, document) {
  const accounts = await web3.eth.getAccounts();
  const userProfileContractInstance = new web3.eth.Contract(contractABIUserProfile, userProfileContractAddress);

  try {
    // Ensure that ID and document are always strings
    const stringID = ID.toString();
    const stringDocument = document === null ? '' : document.toString();

    await userProfileContractInstance.methods.updateProfile(fname, lname, email, stringID, stringDocument).send({
      from: accounts[0],
      gas: 200000,
    });

    console.log('Profile updated successfully on the blockchain');
  } catch (error) {
    console.error('Error updating profile on the blockchain:', error);
    // Handle error
  }
}


async function getUserDataFromChain() {
  const accounts = await web3.eth.getAccounts();
  const userProfileContractInstance = new web3.eth.Contract(contractABIUserProfile, userProfileContractAddress);

  try {
      return await userProfileContractInstance.methods.getUserProfile().call({ from: accounts[0] });
  } catch (error) {
      console.error('Error retrieving user data from the blockchain:', error);
      // Handle error
      return {};
  }
}




app.post('/login', (req, res) => {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(async (stream) => {
      video.srcObject = stream;
      document.body.append(video);

      await loadFaceApiModels();

      video.addEventListener('play', async () => {
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        setInterval(async () => {
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          const inputImage = canvas;

          const detections = await faceapi.detectAllFaces(inputImage)
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (detections.length > 0) {
            
            res.redirect('/home2');
          }
        }, 100);
      });

      video.play();
    })
    .catch((error) => {
      console.error('Error accessing webcam:', error);
    });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});