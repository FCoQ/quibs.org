	var redirecting = false;
	var subHooks = {};
	var hookChange = function(newAnchor, obj) {
		console.log('hookChange(' + newAnchor + ')');
		var gotoSelector = $("a[name='" + newAnchor.substr(1) + "']");

		// do we have a hook for this anchor?
		if (typeof(subHooks[newAnchor]) != 'undefined') {
			// yep! let's try running it
			var ret = subHooks[newAnchor](obj);
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

	// this simulates a subroutine (subpage) action
	var sub = function(triggerAnchor, obj) {
		if (typeof(subHooks[triggerAnchor]) != 'undefined') {
			subHooks[triggerAnchor](obj);
		}

		return false;
	}

	var currentRequest = 0;
	var hassuper = true;

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
		if ($(this).attr('id') == 'toTop') {
			e.preventDefault();
			$('#content-wrapper').animate({scrollTop:0},600);
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
	if (!$(this).hasClass('noajax')) {
		if ($(this).attr('action').substring(0, 1) == '/') {
			e.preventDefault();
			getPage($(this).attr('action'), $(this).serialize());
			return false;
		}
	}
});

$(document).ready(function() {
	var History = window.History;
	History.Adapter.bind(window, 'statechange', function() {
		var State = History.getState();
		if ($('#ajax-current-page').attr('quib-curpage') == State.url.substring(16))
			return;

		getPage(State.url.substring(16));
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
	});  // call supersubs first, then superfish, so that subs are 
					 // not display:none when measuring. Call before initialising 
					 // containing tabs for same reason. 
			

	// Full page background
	$.supersized({
		//Background image
		slides	:  [ { image : '/img/bg1.jpg' } ]
	});
});