var redirecting = false;
var subHooks = {};
var triggers = {};
var qstates = {};
var qsocket; // websocket
var setState = function(name, val) {
	qstates[name] = val;
}
var state = function(name) {
	return qstates[name];
}
var clearStates = function() {
	qstates = {};
}
var addSub = function(name, val) {
	if (!(name in subHooks)) {
		subHooks[name] = [];
	}
	subHooks[name].push(val);
}
var addTrigger = function(name, val) {
	triggers[name] = val;
}
var clearSubs = function() {
	subHooks = {};
}
var clearTriggers = function() {
	triggers = {};
}

var getCSRF = function() {
	var $COOKIE = (document.cookie || '').split(/;\s*/).reduce(function(re, c) {
	  var tmp = c.match(/([^=]+)=(.*)/);
	  if (tmp) re[tmp[1]] = unescape(tmp[2]);
	  return re;
	}, {});
	return $COOKIE.csrf;
}

// this simulates a subroutine (subpage) action
var sub = function(triggerAnchor, obj) {
	var r = false;
	if (typeof(subHooks[triggerAnchor]) != 'undefined') {
		subHooks[triggerAnchor].forEach(function(c) {
			r = c(obj);
		});
	}

	return r;
}

var trigger = function(name) {
	if (typeof triggers[name] != "undefined") {
		triggers[name]();
	}
}

var qsemaphores = {};

var qsemaphore = function(name) {
	if (qsemaphores[name]) {
		return false;
	}

	qsemaphores[name] = true;

	return {
		release: function() {
			delete qsemaphores[name];
		}
	}
}

var resetSemaphores = function() {
	qsemaphores = {};
}

var checkScroll = function() {
	$("a.infinite").each(function() {
		// the scroll bar can behave differently in two different contexts
		// so dumb
		var wtop = $(window).scrollTop();
		var ctop = $("#content-wrapper").scrollTop();

		if (wtop > ctop) {
			if ((wtop + $(window).height()) > ($(this).position().top)) {
				trigger('infinite');
			}
		} else {
			if ((ctop + $(window).height()) > ($(this).position().top + ctop)) {
				trigger('infinite');
			}
		}
	})
}

var qdialog = function(title, text, buttons, onClose) {
	$("#dialog-message").attr('title', title);
	$("#dialog-text").html(text);

	var destroy = function(cb) {
		$("#dialog-message").dialog("close");
		$("#dialog-info").attr('style', 'display:none');
		$("#dialog-img").attr('style', 'display:none');
	}

	$("#dialog-message").dialog({
		draggable: false,
		modal: true,
		buttons: buttons,
		close: function() {
			destroy();

			if (onClose)
				onClose();

			$(this).dialog("destroy");
		}
	});

	this.close = function() {
		$("#dialog-message").dialog("close");
	}

	this.buttons = function(buttons) {
		$("#dialog-message").dialog({
			buttons: buttons
		})
	}

	this.info = function(text, icon) {
		if (text == false) {
			$("#dialog-info").attr('style', 'display:none');
			return;
		}

		$("#dialog-info").attr('style', 'display:block');
		$("#dialog-info-text").html(text);
		$("#dialog-icon").removeClass().addClass(icon);
	}

	this.img = function(src) {
		if (src == false) {
			$("#dialog-img").attr('style', 'display:none');
			return;
		}

		$("#dialog-img>img").attr('src', src);
		$("#dialog-img").attr('style', 'display:block');
	}
}

var qconfirm = function(text, yes, no) {
	var test = new qdialog("Confirm", text, [{
			text: "Cancel",
			class: 'cancelButton',
			click: function() {
				$(this).dialog("destroy");

				if (no)
					no();
			}
		},{
			text: "OK",
			click: function() {
				$(this).dialog("destroy");

				if (yes)
					yes();
			}
		}])
}

$.fn.qeditor = function() {
	var obj = this;

	return {
		val: function(content) {
			return $(obj).sceditor("instance").val(content);
		},
		init: function(width) {
			//if (!width)
			//	width = "895px";

			$(obj).sceditor({
				width: width,
				plugins: "bbcode",
				style: "/css/default.min.css",
				emoticonsEnabled : false,
				emoticons: {},
				toolbar: "bold,italic,underline,strike|left,center,right|size,color,removeformat|orderedlist,bulletlist,code,quote|image,link,youtube,source"
			});
		},
		destroy: function() {
			$(obj).sceditor("instance").destroy();
		}
	}
}

// turns entire page into drag-droppable file thingy
var qdragdrop = function(uploadURL) {
	var o = $("body");

	var handlers = {
		uploading: function() {

		},
		success: function(data) {

		},
		error: function(error) {

		}
	}

	var block = function(e) {
		e.stopPropagation()
		e.preventDefault()
	}

	var stopDrag = function() {
		o.off("dragenter")
		o.off("dragover")
		o.off("drop")
	}

	var onDrop = function(e) {
		block(e);

		if ((e.originalEvent.dataTransfer == undefined) || (e.originalEvent.dataTransfer.files.length == 0)) {
			return handlers.error("You did not drop a file.");
		}

		var file = e.originalEvent.dataTransfer.files[0];

		var fd = new FormData();
		fd.append('file', file);
		fd.append('csrf', getCSRF());

		handlers.uploading();

		var jqXHR = $.ajax({
			xhr: function() {
				var xhrobj = $.ajaxSettings.xhr();
				if (xhrobj.upload) {
					xhrobj.upload.addEventListener('progress', function(event) {
						var percent = 0;
                        var position = event.loaded || event.position;
                        var total = event.total;
                        if (event.lengthComputable) {
                            percent = Math.ceil(position / total * 100);
                        }
                        // TODO: progress bar
					})
				}
				return xhrobj;
			},
			url: uploadURL,
			type: "POST",
			contentType: false,
			processData: false,
			cache: false,
			data: fd,
			dataType: "json",
			success: function(data) {
				if (data.orig) {
					handlers.success(data);
				} else {
					handlers.error("Upload failed.");
				}
			},
			error: function() {
				handlers.error("Upload failed.");
			}
		});
	}

	o.on("dragenter", block)
	o.on("dragover", block)
	o.on("drop", onDrop)

	return {
		end: function() {
			stopDrag();
		},
		on: function(name, val) {
			handlers[name] = val;
		}
	}
}

var hookChange = function(newAnchor, obj) {
	// must be a valid sub name or whatever
	if (!newAnchor.match(/^[#a-zA-Z0-9_\-]+$/)) {
		return;
	}
	console.log('hookChange(' + newAnchor + ')');
	var gotoSelector = $("a[name='" + newAnchor.substr(1) + "']");

	// do we have a hook for this anchor?
	if (typeof(subHooks[newAnchor]) != 'undefined') {
		// yep! let's try running it
		var ret = sub(newAnchor, obj);
		if (ret === false) {
			// the hook returned false, it just wanted to run not change the URL
			return;
		} else if (typeof(ret) != 'undefined' && typeof(ret) != 'boolean') {
			gotoSelector = $(ret); // the hook gave us a new selector to scroll to
		}
	} else if (newAnchor == '#') {
		return;
	}

	if (window.location.hash == newAnchor) {
		// we're already here!
		return;
	}

	if (gotoSelector.length) {
		$('#content-wrapper').animate({scrollTop: $("#content-wrapper").scrollTop() + gotoSelector.offset().top}, 'fast', 'swing', function() {
			window.location.hash = newAnchor;
		});
	} else {
		window.location.hash = newAnchor;
	}
	return;
};

var currentRequest = 0;
var hassuper = false;

function noticebox(msg) {
	if (msg == false) {
		$("#notice-box").stop();
		$("#notice-box").slideUp('fast', function() {
			$("#notice-box").attr('style', 'display:none');
			$("#notice-box").html("");
		});
		return;
	}

	$("#notice-box").stop();
	$("#notice-box").slideUp('fast', function() {
		$("#notice-box").attr('style', 'display:none');

		$('#notice-content').html(msg);
		$("#notice-box").slideDown('fast', function() {
			$("#notice-box").attr('style', 'display:block');
		});
	});
}

function getPage(url, q) {
	if (currentRequest != 0)
		currentRequest.abort();
	// add ajax to the beginning of url
	url = '/ajax' + url;

	$('#pagecontent').stop();
	$('#pagecontent').slideUp('fast', function() {
		$('#pagecontent').attr('style', 'display:none');
	});
	$('.loader').stop();
	$('.loader').slideDown('fast', function() {
		$('.loader').attr('style', 'display:block');
	});

	var cb = function(data) {
		$('.loader').stop();
		$('.loader').slideUp('fast', function() {
			$('.loader').attr('style', 'display:none');
			$('#pagecontent').html(data);
			$('#pagecontent').stop();
			$('#pagecontent').slideDown('fast', function() {
				$('#pagecontent').attr('style', 'display:block');
				var newanchor = '#' + url.split('#', 2)[1];
				if (newanchor == '#undefined')
					onPageLoad(true);
				else
					onPageLoad(true, newanchor);
			});
		});
	};

	if (typeof(q) == 'undefined')
		currentRequest = $.get(url).success(cb).error(function(data, a, b) {
			if (b == "Not Found")
				cb(data.responseText);
			else {
				noticebox(data.responseText);
				cb("");
			}
		});
	else
		currentRequest = $.post(url, q).success(cb).error(function(data, a, b) {
			if (b == "Not Found")
				cb(data.responseText);
			else {
				noticebox(data.responseText);
				cb("");
			}
		});
}

var defaultSunWidth = 150;
var defaultSunHeight = 150;
var defaultSunTop = 45;
var defaultSunLeft = 140;

// background triggers
function setSun() {
	$('#sun').css('display', 'block');

	var w = parseInt($('#supersized img').css('width'));
	var h = parseInt($('#supersized img').css('height'));
	var t = parseInt($('#supersized img').css('top'));
	var l = parseInt($('#supersized img').css('left'));

	var wR = w / 1600;
	var hR = h / 975;

	$('#sun').css('width', (wR * defaultSunWidth) + 'px');
	$('#sun').css('height', (hR * defaultSunHeight) + 'px');

	$('#sun').css('top', (t + defaultSunTop*hR) + 'px');
	$('#sun').css('left', (l + defaultSunLeft*wR) + 'px');
};

var defaultRainbowWidth = 100;
var defaultRainbowHeight = 50;
var defaultRainbowTop = 740;
var defaultRainbowLeft = 1475;

function setRainbow() {
	$('#rainbow').css('display', 'block');

	var w = parseInt($('#supersized img').css('width'));
	var h = parseInt($('#supersized img').css('height'));
	var t = parseInt($('#supersized img').css('top'));
	var l = parseInt($('#supersized img').css('left'));

	var wR = w / 1600;
	var hR = h / 975;

	$('#rainbow').css('width', (wR * defaultRainbowWidth) + 'px');
	$('#rainbow').css('height', (hR * defaultRainbowHeight) + 'px');
	$('#rainbow').css('top', (t + defaultRainbowTop*hR) + 'px');
	$('#rainbow').css('left', (l + defaultRainbowLeft*wR) + 'px');
};

function onPageLoad(ajax, anchor) {
	if (typeof(ajax) == 'undefined')
		ajax = false;

	checkScroll();
	sub('onPageLoad');

	if (typeof(anchor) != 'undefined' && anchor != '') {
		hookChange(anchor, null);
	}

	Cufon.replace('.replace,.sidebar-widget h4',{fontFamily: 'Museo 500'} );
	if (!ajax)
		Cufon.replace('.sf-menu a',{fontFamily: 'Museo Sans 500'} );

	// ColorBox
	$(".video_modal").colorbox({iframe:true, innerWidth:"50%", innerHeight:"50%"});
	$("a[rel='example1']").colorbox({maxWidth:'95%',maxHeight:'95%',scalePhotos:true});
	$("a[rel='example2']").colorbox({transition:"fade"});
	$("a[rel='example3']").colorbox({transition:"none"});
	$("a[rel='example4']").colorbox({slideshow:true});

	// Google Map
	$("#modalmap").colorbox({iframe:true, innerWidth:"50%", innerHeight:"50%", href:" https://maps.google.com/maps?q=9520+tarbutton+rd+ohio&hnear=9510+Tarbutton+Rd,+Mechanicsburg,+Ohio+43044&gl=us&t=h&z=19&output=embed" });

	if ($('#slider').length != 0)
		$('#slider').nivoSlider({
			effect: 'fade'
		});

	$('#quickmenu').tinycarousel({ 
		axis: 'y',
		display: 3, 
		duration: 500
	});

	if ($('#webcam').length != 0 && !hassuper)
		$('#webcam').html('<img border="0" style="width: 245px;height:162px;" src="http://50.34.240.178:8008">');
};

// ajax frontend:
$('a').live('click', function(e) {
	if (!$(this).hasClass('noajax')) {
		// we need to replace this link with an ajax page request
		if ($(this).attr('href').substring(0, ($('#ajax-current-page').attr('quib-curpage') + '#').length) == $('#ajax-current-page').attr('quib-curpage') + '#') {
			e.preventDefault();
			if ($(this).attr('do')) {
				hookChange($(this).attr('do'), this);
			} else {
				hookChange($(this).attr('href').substring($('#ajax-current-page').attr('quib-curpage').length), this);
			}
		} else if ($(this).attr('href').substring(0, 1) == '/') {
			if ($(this).attr('target') != '_blank') {
				e.preventDefault();
				getPage($(this).attr('href'));
			}
		} else if ($(this).attr('href').substring(0, 1) == '#') {
			e.preventDefault();
			if ($(this).attr('do')) {
				hookChange($(this).attr('do'), this);
			} else {
				hookChange($(this).attr('href'), this);
			}
		}
	}
});

$('form').live('submit', function(e) {
	//if (!$(this).hasClass('noajax')) {
		e.preventDefault();
		if ($(this).attr('do')) {
			hookChange($(this).attr('do'), this);
			return false;
		} else if ($(this).attr('action').substring(0, 1) == '/') {
			getPage($(this).attr('action'), $(this).serialize());
			return false;
		}
	//}
});

// hijack POST jquery ajax with CSRF protection
$.old_post = $.post;
$.post = function(url, q) {
	var csrf = getCSRF();
	if ($.type(q) === "string") {
		q += "&csrf=" + csrf;
	} else {
		q.csrf = csrf;
	}
	return $.old_post(url, q);
}

$(document).ready(function() {
	$("#content-wrapper").on('scroll', function() {
		checkScroll();
	})
	$(window).on('scroll', function() {
		checkScroll();
	})

	var History = window.History;
	History.Adapter.bind(window, 'statechange', function() {
		var State = History.getState();
		var u = State.url.split('.org').splice(1).join('.org')
		if ($('#ajax-current-page').attr('quib-curpage') == u)
			return;

		getPage(u);
	});

		// Superfish
	$("ul.sf-menu").supersubs({ 
		minWidth:    10,   // minimum width of sub-menus in em units 
		maxWidth:    25,   // maximum width of sub-menus in em units 
		extraWidth:  1     // extra width can ensure lines don't sometimes turn over 
						   // due to slight rounding differences and font-family 
	}).superfish({
		delay:			300,
		dropShadows:    false
	}).click(function(a) {
		if ($(a.target).closest('a').attr('href') != "#") {
			$(this).find('li.sfHover').hideSuperfishUl();
		}
	});  // call supersubs first, then superfish, so that subs are 
					 // not display:none when measuring. Call before initialising 
					 // containing tabs for same reason. 
			

	// Full page background
	$.supersized({
		//Background image
		slides	:  [ { image : '/img/bg1.jpg' } ]
	});

	$("#toTop").click(function() {
		$('#content-wrapper').animate({scrollTop:0},600);
	})

	// TODO: remove animation time of gritter
	$.extend($.gritter.options, { 
        position: 'top-right',
		fade_in_speed: 0,
		fade_out_speed: 0,
		time: ''
	});

	var lastMessages = null;

	qsocket = io.connect('/')
	qsocket.on('newNotifications', function(messages) {
		if (JSON.stringify(messages) == lastMessages)
			return;
		else
			lastMessages = JSON.stringify(messages);

		var handleMessages = function() {
			messages.forEach(function(e) {
				var title;
				var msg;
				var num = e.num;

				switch (e.type) {
					case "grant":
						title = "New grants";
						msg = num + " new grants have been posted.";
					break;
					case "comment_reply":
						title = "Comment reply";
						msg = num + " new replies to your comments.";
					break;
				}

				$.gritter.add({
					title: title,
					text: msg,
					sticky: true,
					time:'',
					class_name:'qnotification qnotification-' + e.type
				})
			})
		}

		if ($(".qnotification").length > 0) {
			$.gritter.removeAll({
				after_close: function() {
					handleMessages();
				}
			});
		} else {
			handleMessages();
		}
	})
	qsocket.on('chaching', function() {
		var audio = new Audio('/media/chaching.wav');
		audio.volume = 0.2;
		audio.play();
	})

	$('.qnotification-grant').live('click', function() {
		getPage('/inbox/grant');
	})

	$('.qnotification-comment_reply').live('click', function() {
		getPage('/inbox/comment_reply');
	})
});