	var currentRequest = 0;

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
				});
			});
		};

		if (typeof(q) == 'undefined')
			currentRequest = $.get(url).success(cb);
		else
			currentRequest = $.post(url, q).success(cb);
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

function onPageLoad(ajax) {
	if (typeof(ajax) == 'undefined')
		ajax = false;

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

	if ($('#webcam').length != 0)
			$('#webcam').html('<img border="0" style="width: 245px;height:162px;" src="http://50.34.240.178:8008">');

	$('#quickmenu').tinycarousel({ 
		axis: 'y',
		display: 3, 
		duration: 500
	});
};

// ajax frontend:
$('a').live('click', function(e) {
	if (!$(this).hasClass('noajax')) {
		// we need to replace this link with an ajax page request
		if ($(this).attr('href').substring(0, 1) == '/') {
			e.preventDefault();
			getPage($(this).attr('href'));
		}
	}
});

	// Scroll to Top
	$('#toTop').live('click', (function() {
		$('#content-wrapper').animate({scrollTop:0},600);
	}));	

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