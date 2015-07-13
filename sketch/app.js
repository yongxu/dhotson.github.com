
var devicePixelRatio = window.devicePixelRatio || 1
var max = Math.min(window.innerWidth, window.innerHeight);
var canvas = document.createElement('canvas');
var ctx;
window.onresize = function () {
    ctx = canvas.getContext('2d');
    ctx.restore();
    devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
};
window.onresize();

canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.cursor = 'none';
canvas.style.position = 'absolute';
canvas.style.top = 0;
canvas.style.left = 0;


document.addEventListener("DOMContentLoaded", function(event) {
    document.body.appendChild(canvas);
});

var userid = Math.round(Math.random() * 1000);
var colors = [
    '#3DE4B5',
    '#43B6E8',
    '#FFE65B',
    '#FF5F48',
    '#FFFFFF',
];
var color = colors[userid % colors.length];

// window.addEventListener('keydown', function(e) {
//     if (e.keyCode) {
//         color = colors[++userid % colors.length];
//     }
// });

var paths = {};
var pathsRef = new Firebase('https://torrid-torch-7237.firebaseio.com/paths');

var labels = {};
var labelsRef = new Firebase('https://torrid-torch-7237.firebaseio.com/labels');

var cursors = {};
var cursorsRef = new Firebase('https://torrid-torch-7237.firebaseio.com/cursors');

var cursor = cursorsRef.push({ x: null, y: null });
var localCursor;

var amOnline = new Firebase('https://torrid-torch-7237.firebaseio.com/.info/connected');
var userRef = new Firebase('https://torrid-torch-7237.firebaseio.com/presence/' + userid);
amOnline.on('value', function(snapshot) {
    if (snapshot.val()) {
        userRef.onDisconnect().remove();
        userRef.set(true);
        cursor.onDisconnect().remove();
    }
});
var offset;
var offsetRef = new Firebase("https://torrid-torch-7237.firebaseio.com/.info/serverTimeOffset");
offsetRef.on("value", function(snap) {
      offset = snap.val();
      console.log('Server time offset: '+offset);
});

pathsRef.limitToLast(100).on("value", function(snapshot) {
    paths = snapshot.val();
}, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
});

labelsRef.on("value", function(snapshot) {
    labels = snapshot.val();
}, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
});

cursorsRef.on("value", function(snapshot) {
    cursors = snapshot.val();
}, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
});

var currentImage;
var imageCache = {};
var imageRef = new Firebase('https://torrid-torch-7237.firebaseio.com/currentimage');
imageRef.on('value', function(s) {
    var src = s.val();

    if (src) {
        if (imageCache[src]) {
            currentImage = imageCache[src];
        } else {
            currentImage = imageCache[src] = new Image();
            currentImage.src = src;
        }
    }
});


var current;
var currentPoints;

var n;
document.addEventListener('mousedown', function(e) {
    n = 0;
    current = pathsRef.push();
    currentPoints = current.child('points');
    currentPoints.push({x: e.clientX, y: e.clientY, t: Firebase.ServerValue.TIMESTAMP});
    current.child('color').set(color);
});

var currentInput;
document.addEventListener('mouseup', function(e) {
    if (n < 4) {
        var currentInput = createInput(e.clientX, e.clientY);
    }
    currentPoints = null;
    current = null;
});

document.addEventListener('mousemove', function(e) {
    n++;
    if (currentPoints) {
        currentPoints.push({x: e.clientX, y: e.clientY, t: Firebase.ServerValue.TIMESTAMP});
    }

    localCursor = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', _.throttle(function(e) {
    cursor.set({ x: e.clientX, y: e.clientY, t: Firebase.ServerValue.TIMESTAMP, userid: userid, color: color });
}, 75));



requestAnimationFrame(function draw() {
    devicePixelRatio = window.devicePixelRatio || 1
    var i, j;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentImage) {
        // ctx.drawImage(currentImage, 0, 0, 900 * devicePixelRatio, 900 * devicePixelRatio);
    }

    _.forEach(paths, function(path) {
        var points = _.filter(path.points, function(p, k) {
            return (p.t > (+new Date + offset - 15000));
        });
        if (points.length >= 4) {
            ctx.save();
            ctx.lineWidth = 3 * devicePixelRatio;
            ctx.strokeStyle = path.color;

            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 4 * devicePixelRatio;

            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(points[0].x * devicePixelRatio, points[0].y * devicePixelRatio);
            var curves = catmullRom(points);
            for (i=0; i<curves.length; i++) {
                var c = curves[i];
                ctx.bezierCurveTo(
                    c.cp1.x * devicePixelRatio,
                    c.cp1.y * devicePixelRatio,
                    c.cp2.x * devicePixelRatio,
                    c.cp2.y * devicePixelRatio,
                    c.p2.x * devicePixelRatio,
                    c.p2.y * devicePixelRatio);
            }
            ctx.stroke();
            ctx.restore();
        }
    });

    _.forEach(_.filter(labels, function() { return true; }), function(label) {
        if (label.t < (+new Date + offset - 16000)) {
            return;
        }

        ctx.save();
        ctx.font = Math.round(32 * devicePixelRatio) + "px \"Helvetica Neue\", Helvetica, Arial, sans-serif";
        ctx.fillStyle = label.color;
        ctx.shadowColor = null;
        ctx.shadowBlur = 0;
        var alpha = Math.max(0, Math.min(1, (label.t - (+new Date + offset - 15000))/1000));
        ctx.globalAlpha = alpha;
        ctx.fillText(label.text, label.x * devicePixelRatio, label.y * devicePixelRatio);
        ctx.restore();
    });

    _.forEach(cursors, function(cursor) {
        if (cursor.userid !== userid) {
            ctx.save();
            ctx.fillStyle = cursor.color;
            ctx.shadowColor = 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = 0 * devicePixelRatio;
            ctx.fillRect(
                (cursor.x-2) * devicePixelRatio,
                (cursor.y-2) * devicePixelRatio,
                4 * devicePixelRatio,
                4 * devicePixelRatio
                );
            ctx.restore();
        }
    });

    if (localCursor) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(255,255,255,1)';
        if (current) {
            ctx.shadowBlur = 15 * devicePixelRatio;
        } else {
            ctx.shadowBlur = 5 * devicePixelRatio;
        }
        // ctx.fillRect(localCursor.x-2, localCursor.y-2, 4, 4);
        drawPen(localCursor.x, localCursor.y, color);
        ctx.restore();
    }

    // setTimeout(function() {
    requestAnimationFrame(draw);
    // }, 2000);
});


var r = function(d) { return d * Math.PI / 180; };
function drawPen(x, y, color) {
    ctx.save();

    // ctx.shadowColor = null;
    // ctx.shadowBlur = 0;
    // ctx.strokeStyle = color;
    // ctx.lineWidth = 1 * devicePixelRatio;
    // ctx.moveTo(0, 0);
    // ctx.beginPath();
    // var length = 16;
    // var width = 3;
    // ctx.lineTo(0 * devicePixelRatio, (-width) * devicePixelRatio);
    // ctx.lineTo(length * devicePixelRatio, (-length - width) * devicePixelRatio);
    // ctx.lineTo((length + width) * devicePixelRatio, (-length) * devicePixelRatio);
    // ctx.lineTo(width * devicePixelRatio, 0);
    // ctx.lineTo(0, 0);
    // ctx.closePath();
    // ctx.stroke();


    // ctx.translate(x * devicePixelRatio, y * devicePixelRatio);
    // ctx.rotate(r(30));
    // var l = 40;
    // ctx.fillStyle = color;
    // ctx.lineWidth = 0;
    // ctx.shadowBlur = 0;
    // ctx.beginPath();
    // ctx.moveTo(0,0);

    // ctx.lineTo(
    //     -(l * Math.sin(r(75)) * Math.cos(r(75))) * devicePixelRatio,
    //     -(l * Math.sin(r(75)) * Math.sin(r(75))) * devicePixelRatio
    // );
    // ctx.lineTo(
    //     0,
    //     -l * devicePixelRatio
    // );
    // ctx.lineTo(
    //     (l * Math.sin(r(75)) * Math.cos(r(75))) * devicePixelRatio,
    //     -(l * Math.sin(r(75)) * Math.sin(r(75))) * devicePixelRatio
    // );
    // ctx.closePath();
    // ctx.fill();
    // ctx.stroke();

    // ctx.save();
    // ctx.beginPath();
    // if (pattern) { ctx.fillStyle = pattern; }
    // ctx.arc(0, -l * devicePixelRatio, l * Math.sin(r(15)) + 2, 0, 2 * Math.PI, false);
    // ctx.clip();
    // ctx.drawImage(
    //         avatar,
    //         -l * Math.sin(r(15)) - 2,
    //         -l * devicePixelRatio - l * Math.sin(r(15)) - 2,
    //         l * Math.sin(r(15)) * 2 * devicePixelRatio + 4,
    //         l * Math.sin(r(15)) * 2 * devicePixelRatio + 4);
    // ctx.restore();

    // ctx.beginPath();
    // ctx.lineWidth = 1 * devicePixelRatio;
    // ctx.strokeStyle = '#FFFFFF';
    // ctx.arc(0, -l * devicePixelRatio, l * Math.sin(r(15)) + 2, 0, 2 * Math.PI, false);
    // ctx.stroke();

    // ctx.fillStyle = color;
    // ctx.fillRect(-1 * devicePixelRatio, -1 * devicePixelRatio, 2 * devicePixelRatio, 2 * devicePixelRatio);

    ctx.translate(x * devicePixelRatio, y * devicePixelRatio);
    ctx.fillStyle = color;
    ctx.fillRect(-2 * devicePixelRatio, -2 * devicePixelRatio, 4 * devicePixelRatio, 4 * devicePixelRatio);

    ctx.restore();
};


function createInput(x, y) {
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Say something...';
    input.style.left = x;
    input.style.top = y - 32;
    input.style.color = color;

    input.onblur = function() {
        document.body.removeChild(this);
    }.bind(input);

    input.onkeydown = function(e) {
        if (e.keyCode === 13) {
            var text = input.value;
            labelsRef.push({
                text: text,
                color: color,
                x: x,
                y: y,
                t: Firebase.ServerValue.TIMESTAMP
            });
            this.blur();
        }

        if (e.keyCode === 27) {
            this.blur();
        }
    }.bind(input);

    document.body.appendChild(input);
    input.focus();

    return input;
};
