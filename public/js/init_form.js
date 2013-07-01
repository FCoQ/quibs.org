	// Form Init
	var options = { 
		beforeSubmit:  validate,  // pre-submit callback 
		success:       showResponse,  // post-submit callback 
		resetForm: true        // reset the form after successful submit 
	}; 
					
	$('#contact_form').ajaxForm(options); 
					
	function showResponse(responseText, statusText){
		$('#contact_form').slideUp({ opacity: "hide" }, "normal")
		$('#success').slideDown({ opacity: "show" }, "slow")
		
	}
					
	function validate(formData, jqForm, options) {
		$("p.error").slideUp({ opacity: "hide" }, "fast");
				 
		var nameValue = $('input[name=cform_name]').fieldValue(); 
		var emailValue = $('input[name=cform_email]').fieldValue();
		var messageValue = $('textarea[name=cform_message]').fieldValue(); 
		
		var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
		var correct = true;
		
		if (!nameValue[0]) {
			$("p.error.wrong_name").slideDown({ opacity: "show" }, "slow");
			correct = false;
		}
		
		if (!emailValue[0]) {
			$("p.error.wrong_email").slideDown({ opacity: "show" }, "slow");
			correct = false;
		} else if(!emailReg.test(emailValue[0])) {
			$("p.error.wrong_email").slideDown({ opacity: "show" }, "slow");
			correct = false;
		}
		
		if (!messageValue[0]) {
			$("p.error.wrong_message").slideDown({ opacity: "show" }, "slow");
			correct = false;
		}
		
		if (!correct) {return false;}
	} 	