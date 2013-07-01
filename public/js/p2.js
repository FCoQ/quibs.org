function getPage(url) {
	// add ajax to the beginning of url
	url = '/ajax' + url;

	$.get(url, function(data) {
		$('#pagecontent').html(data);
	});
}

/*jQuery.noConflict();*/
jQuery(function($) { 
		
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

	// Cufon
	Cufon.replace('.replace,.sidebar-widget h4',{fontFamily: 'Museo 500'} );
	Cufon.replace('.sf-menu a',{fontFamily: 'Museo Sans 500'} );
	
	// ColorBox
	$(".video_modal").colorbox({iframe:true, innerWidth:"50%", innerHeight:"50%"});
	$("a[rel='example1']").colorbox({maxWidth:'95%',maxHeight:'95%',scalePhotos:true});
	$("a[rel='example2']").colorbox({transition:"fade"});
	$("a[rel='example3']").colorbox({transition:"none"});
	$("a[rel='example4']").colorbox({slideshow:true});

	// Scroll to Top
	$('#toTop').click(function() {
		$('#content-wrapper').animate({scrollTop:0},600);
	});	
	
	// Twitter Feed
	$(".pkb-tweet").tweet({
		username: "envato",
		join_text: "auto",
		count: 1,
		auto_join_text_default: "we said,",
		auto_join_text_ed: "we",
		auto_join_text_ing: "we were",
		auto_join_text_reply: "we replied to",
		auto_join_text_url: "we were checking out",
		loading_text: "loading tweets..."
	});

	
	// Google Map
	$("#modalmap").colorbox({iframe:true, innerWidth:"50%", innerHeight:"50%", href:" https://maps.google.com/maps?q=9520+tarbutton+rd+ohio&hnear=9510+Tarbutton+Rd,+Mechanicsburg,+Ohio+43044&gl=us&t=h&z=19&output=embed" });
});

$(document).ready(function() {
	if ($('#slider').length != 0)
		$('#slider').nivoSlider({
			effect: 'fade'
		});

	if ($('#webcam').length != 0)
			$('#webcam').html('<img border="0" style="width: 245px;height:162px;" src="http://50.34.240.178:8008">');

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

	// background triggers
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

	////// TODO: notifications

	$('#quickmenu').tinycarousel({ 
		axis: 'y',
		display: 3, 
		duration: 500
	});


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
});