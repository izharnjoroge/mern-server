const express = require("express");
const router = express.Router();
const {getProducts, getProduct, createProduct, updateProduct, deleteProduct} = require('../controllers/product.controller.js');
const verifyToken = require("../middleware/auth.middleware.js");
const verifyRole = require("../middleware/role.middleware.js");

router.get('/',getProducts);
router.get("/:id", getProduct);
router.post("/", verifyToken,verifyRole('admin') ,createProduct);
router.patch("/:id", verifyToken , verifyRole("admin") , updateProduct);
router.delete("/:id",verifyToken , verifyRole("admin") ,deleteProduct);




module.exports = router;