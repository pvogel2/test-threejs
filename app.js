var EXPRESS = require('express');

var app = EXPRESS();
app.use(EXPRESS.static('html'));
app.use('/three/res/js', EXPRESS.static('js'));
app.use('/three/res/obj', EXPRESS.static('obj'));
app.get('/', function (req, res) {
    res.send('Current state is new!');
});

var server = app.listen(80, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
