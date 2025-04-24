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
    try {
      req.user = await findUserWithToken(token);
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
    res.send(req.user);
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
  console.log("params", req.params.id);
  console.log("userid", req.user.id);
  try {
    if(req.params.id !== req.user.id){
      const error = Error('Not authorized');
      error.status = 401;
      throw error;
    }
    res.send(await fetchFavorites(req.params.id));
  }
  catch(ex){
    next(ex);
  }
});

app.post('/api/users', isLoggedIn, async(req, res, next)=> {
  try {
    const { id } = req.body;
    const response = await createUser();
    const token = setToken(response.id);
    res.status(200).json(token);
  }
  catch(ex){
    next(ex);
  }
});

app.post('/api/users/:id/products', isLoggedIn, async(req, res, next)=> {
  try {
    if(req.params.id !== req.user.id){
      const error = Error('Not authorized');
      error.status = 401;
      throw error;
    }
    res.status(201).send(await createProduct({user_id: req.params.id, product_id: req.body.product_id}));
  }
  catch(ex){
    next(ex);
  }
});

app.post('/api/users/:id/favorites', isLoggedIn, async(req, res, next)=> {
  try {
    if(req.params.id !== req.user.id){
      const error = Error('Not authorized');
      error.status = 401;
      throw error;
    }
    res.status(201).send(await createFavorite({user_id: req.params.id, favorite_id: req.body.favorite_id}));
  }
  catch(ex){
    next(ex);
  }
});

app.delete('/api/users/:user_id/favorites/:id', isLoggedIn, async(req, res, next)=> {
  try {
    if(req.params.id !== req.user.id){
      const error = Error('Not authorized');
      error.status = 401;
      throw error;
    }
    await destroyFavorite({ user_id: req.params.user.id, id: req.params.id});
    res.sendStatus(204);
  } catch(ex){
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

  await createTables();
  console.log('tables created');

  const [moe, lucy, ethyl, curly, foo, bar, bazz, quq, fip] = await Promise.all([
    createUser({ username: 'moe', password: 'm_pw'}),
    createUser({ username: 'lucy', password: 'l_pw'}),
    createUser({ username: 'ethyl', password: 'e_pw'}),
    createUser({ username: 'curly', password: 'c_pw'}),
    createProduct({ name: 'foo' }),
    createProduct({ name: 'bar' }),
    createProduct({ name: 'bazz' }),
    createProduct({ name: 'quq' }),
    createProduct({ name: 'fip' })
  ]);

  console.log(await fetchUsers());
  console.log(await fetchProducts());

  const userFavorites = await Promise.all([
    createFavorite({ user_id: moe.id, product_id: foo.id}),
    createFavorite({ user_id: moe.id, product_id: bar.id}),
    createFavorite({ user_id: lucy.id, product_id: bazz.id}),
    createFavorite({ user_id: lucy.id, product_id: fip.id})
  ]);

  console.log(await fetchFavorites(moe.id));
  await destroyFavorite({ user_id: moe.id, id: foo.id});
  console.log(await fetchProducts(moe.id));
  console.log('data seeded');

  app.listen(port, ()=> console.log(`listening on port ${port}`));
};

init();