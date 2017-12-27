/**
 * Created by Linn on 2017-12-23.
 */
const express = require("express");
const router = express.Router();

router.get("/", (req,res) => {
    res.send({response: "I am alive"}).status(200)
});

module.exports = router;