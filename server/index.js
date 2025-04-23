const {
  client,
  createTables,
  createUser,
  createProduct,
  createFavorite,
  fetchUsers,
  fetchProducts,
  fetchFavorites,
  destroyFavorite,
  authenticate,
  findUserWithToken
} = require('./db');
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "1234";
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

//for deployment only
const path = require('path');
app.get('/', (req, res)=> res.sendFile(path.join(__dirname, '../client/dist/index.html')));
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'))); 

const isLoggedIn = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7);
    console.log(token);
    try {
      const { id } = jwt.verify(token, JWT_SECRET);
      req.userId = id;
      next();
    } catch (error) {
      next(error);
    }
  };

  const setToken = (id) => {
    return jwt.sign({id}, JWT_SECRET);
  };

app.post('/api/auth/login', async(req, res, next)=> {
  try {
    res.send(await authenticate(req.body));
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/auth/me', isLoggedIn, async(req, res, next)=> {
  try {
    res.send(await findUserWithToken(req.userId));
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users', async(req, res, next)=> {
  try {
    res.send(await fetchUsers());
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/favorites', isLoggedIn, async(req, res, next)=> {
  try {
    res.send(await fetchFavorites(req.userId));
  }
  catch(ex){
    next(ex);
  }
});

app.post('/api/users/:id/favorites', isLoggedIn, async(req, res, next)=> {
  try {
    const { product } = req.body;
    const response = await createFavorite(product);
    const token = setToken(response.id);
    res.status(200).json(token);
  }
  catch(ex){
    next(ex);
  }
});

app.delete('/api/users/:user_id/favorites/:id', isLoggedIn, async(req, res, next)=> {
  try {
    const { product } = req.body;
    const response = await destroyFavorite(product);
    const token = setToken(response.id);
    res.status(200).json(token);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/products', async(req, res, next)=> {
  try {
    res.send(await fetchProducts());
  }
  catch(ex){
    next(ex);
  }
});

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message ? err.message : err });
});

const init = async()=> {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log('connected to database');

  // await createTables();
  // console.log('tables created');

  // const [moe, lucy, ethyl, curly, foo, bar, bazz, quq, fip] = await Promise.all([
  //   createUser({ username: 'moe', password: 'm_pw'}),
  //   createUser({ username: 'lucy', password: 'l_pw'}),
  //   createUser({ username: 'ethyl', password: 'e_pw'}),
  //   createUser({ username: 'curly', password: 'c_pw'}),
  //   createProduct({ name: 'foo' }),
  //   createProduct({ name: 'bar' }),
  //   createProduct({ name: 'bazz' }),
  //   createProduct({ name: 'quq' }),
  //   createProduct({ name: 'fip' })
  // ]);

  console.log(await fetchUsers());
  console.log(await fetchProducts());

  // console.log(await fetchFavorites(moe.id));
  // const favorite = await createFavorite({ user_id: moe.id, product_id: foo.id });
  app.listen(port, ()=> console.log(`listening on port ${port}`));
};

init();