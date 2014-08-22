// Progress Pro 
//
// progressive profiling script for Eloqua 10
// Copyright 2011 KPA LLC
// Written by Eli Snyder <esnyder@kpaonline.com>
//
// Licensed under the GPL, see https://github.com/jquery/jquery/blob/master/GPL-LICENSE.txt
// Progress Pro is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation; either version 2 of the License, or (at your option) any
// later version.
// Progress Pro is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
// A PARTICULAR PURPOSE. See the GNU General Public License for more details.
// You should have received a copy of the GNU General Public License along with
// Progress Pro; if not, write to the Free Software Foundation, Inc., 59 Temple
// Place, Suite 330, Boston, MA 02111-1307 USA
//
// Requires jquery and jquery.validate and additional-methods
// Pre-populates an Eloqua 10 form using data lookups, 
// 	then hides questions according to specified conditions.
// Tracks incoming channel via an optional GET parameter "ch" which is written to a field 
//	called "Channel History"
//
// Setup: you must create two data lookups in Eloqua, one to look up the email address 
//		by cookie GUID, and one to look up your other fields by email address. 
//		specify the Eloqua data lookup keys for these lookups as elqDLKey_Cookie and elqDLKey_Email
// 	as shown below
// Usage: call prePop to prepopulate the form, then as a callback function, call addChannel 
//		to do (optional) channel tracking, and call progressiveProfile to skip fields as specified
//
// Demo here: http://go.kpaonline.com/LP=26?elqCampaignId=16&ch=topliners
//
//*********************************************************************************************
//
// Example Call 
// place similar code in the <head> section of your landing page, replacing "mydomain" 
// with your domain name, "mySiteId" with your Eloqua site ID, and "/assets/js/" with the path to your copy of this script.
// Modify the field database names, skip rules, and validation rules to suit your form
// IMPORTANT: the HTML names of your form elements must match the corresponding Eloqua database field names.
//
//	<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.0/jquery.min.js"></script>
//	<script type="text/javascript" src="http://ajax.aspnetcdn.com/ajax/jquery.validate/1.8/jquery.validate.min.js"></script>
//	<script type="text/javascript" src="http://ajax.aspnetcdn.com/ajax/jquery.validate/1.8/additional-methods.js"></script>
//	<script type="text/javascript">
//		var elqSiteId = mySiteId;
//	    var _elqQ = _elqQ || [];
//	    _elqQ.push(['elqSetSiteId', elqSiteId]);
//	</script>
//	<script type="text/javascript" src="http://www.mydomain.com/assets/js/progressPro.js"></script>
//
//<script type="text/javascript">
//	$(document).ready(function() {	
//
//		var elqDLKey_Cookie = escape('#####');
//		var elqDLKey_Email = escape('#####');
//		var theseFields = ['C_EmailAddress', 'C_FirstName', 'C_LastName', 'C_Company','C_Primary_Interest1', 'C_BusPhone', 'C_Website1', 'C_Lead_Role1', 'C_Function1', 'C_Title', 'C_Company_Type1', 'C_Project_Time_Frame1']; 
//		var popFields = ['C_FirstName', 'C_LastName', 'C_Company','C_Primary_Interest1', 'C_BusPhone', 'C_Website1', 'C_Lead_Role1', 'C_Function1', 'C_Title', 'C_Company_Type1', 'C_Project_Time_Frame1'];
//		var openQuestions = 4;
//		var fixedQuestions = 1;
//		var thisForm = 'form21';
//      var channelField = 0;
//      var emailField = 'C_EmailAddress';
//        var visitorEmailField = 'V_ElqEmailAddress';
//  		var myValidationRules = { rules: {C_FirstName: {required: true}, C_LastName: {required: true}, 
//  					 C_Title: {required: true}, C_Company: {required: true}, C_Website1: {required: true},
//					 C_Primary_Interest1: {required: true},C_Project_Time_Frame1: {required: true},C_Lead_Role1: {required: true},C_Function1: {required: true},C_Company_Type1: {required: true},
//  					 C_BusPhone: { required: true, phoneUS: true }, C_EmailAddress: { required: true, email: true } } };
//  		var showAlways = {action: 'show', depends: '', operator: 'always', condition: ''};
//		var mySkipRules = {'C_Email_Opt_In1': {1: showAlways}, 'C_Requests_Contact1': {1: showAlways}}
//  		prePop(thisForm, theseFields, elqDLKey_Cookie, elqDLKey_Email, emailField, visitorEmailField, function(){
//  			progressiveProfile(openQuestions, fixedQuestions, thisForm, theseFields, popFields, elqDLKey_Cookie, 
//  										elqDLKey_Email, emailField, channelField, myValidationRules, mySkipRules);
//  		});
//
//  	});
//</script>
//
//
//*********************************************************************************************

var debugProgressPro = 0;
var progressProAutoSubmit = 0;
var progressProValidator = 0;

function getUrlVars()
{
//simple function to read get parameters, used for channel tracking
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}
function addChannel(formId, channelField)
{
//function to append the value of the ch parameter (formatted, along with form name) 
//to a field called "Channel History" - used to track the source channel
//of a registrant, e.g. http://go.kpaonline.com/LP=26?elqCampaignId=16&ch=topliners
//records that the visitor came from Topliners
    if(debugProgressPro) console.log('calling addchannel');
    var patt1 = /^[-_a-zA-Z0-9]+$/;
	if(getUrlVars()['ch']) var chan = getUrlVars()['ch'].match(patt1);
	if (chan != null){
		chan = $('#'+formId+' input[name="'+channelField+'"]').val() + formId + ' ' + $('#'+formId).attr('name') + ' channel: ' + chan + ' || ';
		$('#'+formId+' input[name="'+channelField+'"]').val(chan);
	}
}
function popByEmail(formId, myEmail, poparray, elqDLKey_Email, callback) {
//function to populate fields by using an Eloqua data lookup based on email address
//you must set up a data lookup by email in Eloqua and specify the lookup key
//first set up data lookup variables for email-based contact lookup 
    if(debugProgressPro) console.log('populating fields by email '+myEmail);
    for (i in poparray){
		$('#'+formId+' [name="'+poparray[i]+'"]').val('');
	}
	if(typeof callback == 'function'){
        if(debugProgressPro) console.log('calling callback function: '+callback);
		callback();
  	}
  	if(myEmail == ''){
		return;
	}
	var elqDLLookup = '<C_EmailAddress>'+myEmail+'</C_EmailAddress>';
	var fieldval;
	SetElqContent = function(){
		if(debugProgressPro) console.log('called SetElqContent');
		for (i in poparray){
			fieldval = GetElqContentPersonalizationValue(poparray[i]);
			if(debugProgressPro) console.log('setting field '+poparray[i]+' to '+fieldval);
			$('#'+formId+' [name="'+poparray[i]+'"]').val(fieldval);
		}
		if(typeof callback == 'function'){
            if(debugProgressPro) console.log('calling callback function: '+callback);
    		callback();
      	}
    };
    _elqQ.push(['elqDataLookup', elqDLKey_Email, elqDLLookup]);
}
(function($) {
//jquery plugin to change enter to tab for form fields, see http://code.google.com/p/jquerytabtoselect/
    jQuery.fn.enterToTab = function() {
        return this.each(function() {
            $(this).bind('keypress', function(event) {
                if (event.keyCode == '13') {
                    event.preventDefault();
                    var list = $(":focusable");
                    list.eq(list.index(this)+1).focus().select();
                }
            });
        });
    }
    $.extend($.expr[':'], {
        focusable: function(element) {
            var nodeName = element.nodeName.toLowerCase(),
                tabIndex = $.attr(element, 'tabindex');
                return (/input|select|textarea|button|object/.test(nodeName)
                     ? !element.disabled
                    : 'a' == nodeName || 'area' == nodeName
                    ? element.href || !isNaN(tabIndex)
                    : !isNaN(tabIndex))
                    // the element and all of its ancestors must be visible
                    // the browser may report that the area is hidden
                    && !$(element)['area' == nodeName ? 'parents' : 'closest'](':hidden').length;
        }
    });
})(jQuery);
function prePop(formId, poparray, elqDLKey_Cookie, elqDLKey_Email, emailField, visitorEmailField, callback) {
//user should call this function. poparray is an array of field ID numbers and corresponding Eloqua database field names
//prepopulate field values from a user-specified array of Eloqua field names
//first change default enter submit action to tab for all but the submit button to prevent overwriting data accidentally by pressing enter
if(debugProgressPro) console.log('calling prepop');
	$('#'+formId+' input').not('input[type="submit"]').enterToTab();
	$('#'+formId+' select').enterToTab();
	$('#'+formId+' textarea').enterToTab();
	var n=0;
//if the email field is prefilled, use that value for the email address
	var myEmail = $('#'+formId+' [name="'+emailField+'"]').val();
//set up default personalization function (only populates email)
	GetElqContentPersonalizationValue = function(fieldName){
		if (fieldName == emailField){
			myEmail = $('#'+formId+' [name="'+emailField+'"]').val();
			return myEmail;
		}else{
			return'';
		}
	};
	if(debugProgressPro) console.log('initial email = '+myEmail);
	if (myEmail == '') {
		if(debugProgressPro) console.log('no email');
//if there is no email address, try to obtain it using a data lookup based on the visitor's Eloqua tracking cookie
		if (typeof _elqQ != 'undefined'){
//set up data lookup variables for cookie-based visitor lookup
			SetElqContent = function() {
				if(debugProgressPro) console.log('calling setElqContent');
//set email according to cookie
  				myEmail = GetElqContentPersonalizationValue(visitorEmailField);
				popByEmail(formId, myEmail, poparray, elqDLKey_Email, callback);
                if(debugProgressPro) console.log('after cookie lookup, email = '+myEmail);
				return;
			};
			if(debugProgressPro) console.log('calling elq js');
	        _elqQ.push(['elqDataLookup', elqDLKey_Cookie, '']);
		}
	}
//prepopulate fields according to email lookup
	popByEmail(formId, myEmail, poparray, elqDLKey_Email, callback);
	return;
}

function skipCondition(formId, skipOption){
// evaluate whether the hide or show condition is true for an advanced skip rule

	var did = '#'+formId+' [name="' + skipOption.depends + '"]';
	
  if($(did).attr('type') == 'radio') {		
  var radioname = skipOption.depends;
	switch(skipOption.operator){
//evaluate the condition according to the specified operator
	case 'eq':
		if ($('#'+formId+' [name*="'+radioname+'"][type=radio]:checked').val() == skipOption.condition){
			
			return 1;
		}else{
			return 0;
		}
		break;
	case 'neq':
		if ($('#'+formId+' [name*="'+radioname+'"][type=radio]:checked').val() != skipOption.condition){
			return 1;
		}else{
			return 0;
		}
		break;
	case 'contains':
		patt = new RegExp(skipOption.condition,'i');
		if (patt.test($('#'+formId+' [name*="'+radioname+'"][type=radio]:checked').val())){
			return 1;
		}else{
			return 0;
		}
		break;
	case 'always':
		return 1;
		break;
	default:
//if no operator is specified, use the equals operator
		if ($('#'+formId+' [name*="'+radioname+'"][type=radio]:checked').val() == skipOption.condition){
			return 1;
		}else{
			return 0;
		}
		break;
	}	
	
  }else{
  	
	switch(skipOption.operator){
//evaluate the condition according to the specified operator
	case 'eq':
		if ($(did).val() == skipOption.condition){
			
			return 1;
		}else{
			return 0;
		}
		break;
	case 'neq':
		if ($(did).val() != skipOption.condition){
			return 1;
		}else{
			return 0;
		}
		break;
	case 'contains':
		patt = new RegExp(skipOption.condition,'i');
		if (patt.test($(did).val())){
			return 1;
		}else{
			return 0;
		}
		break;
	case 'always':
		return 1;
		break;
	default:
//if no operator is specified, use the equals operator
		if ($(did).val() == skipOption.condition){
			return 1;
		}else{
			return 0;
		}
		break;
	}
  }
}

function skipField(formId, fieldname){
//hide field named fieldname and remove its validation rules
if(debugProgressPro) console.log('skipping field '+fieldname);
	$('#'+formId+' p:has([name="'+fieldname+'"])').hide();
	$('#'+formId+' [name="'+fieldname+'"]').rules('remove');
}

function skipIfNotShown(formId, sinsskipOptions, fieldname){
//hide the field unless any "show" condition exists and is true
	var showThis = 0;
	for (x in sinsskipOptions){
		if (x == fieldname){
			var ruleset = sinsskipOptions[x];
			for (y in ruleset){
				if(ruleset[y].action == 'show'){
					if (skipCondition(formId, ruleset[y])) showThis = 1;
				}
			}
		}
	}
	if(showThis){
		return 0;
	}else{
		skipField(formId, fieldname);
		return 1;
	}
}

function skipIfHidden(formId, sihskipOptions, fieldname){
//hide this field if it has a "hide" rule, unless there is
//a "show" rule (show rules take priority)
if(debugProgressPro) console.log('calling skipIfHidden for field '+fieldname);
	var hideThis = 0;	
	for (x in sihskipOptions){
		if (x == fieldname){
			var ruleset = sihskipOptions[x];
			for (y in ruleset){
				if(ruleset[y].action == 'hide'){
					if (skipCondition(formId, ruleset[y])) hideThis = 1;
				}
			}
		}
	}
	if(hideThis){
		skipIfNotShown(formId, sihskipOptions, fieldname);
		return 1;
	}else{
		return 0;
	}
}

function proProgress(formId, sd, ad, mySkipOptions, formFields) {
	var newSkipOptions = new Array();
	$.extend(true, newSkipOptions, mySkipOptions);
	nfields = formFields.length;
	if(debugProgressPro) {
	    console.log('calling proProgress, nfields='+nfields+' sd = '+sd+' ad = '+ad+' Skip options:');
	    console.dir(mySkipOptions);
	}
	var n=0;
	//first make sure all fields are shown, then hide them.
 	for(i in formFields){
 		$('#'+formId+' p:has([name="'+formFields[i]+'"])').show();
 	}
     
     if(debugProgressPro) console.log('all fields shown: '+formFields);
//leave ad questions at the top even if answered and count unanswered questions
	for(i=0;i<ad;i++){
		if($('#'+formId+' [name="'+formFields[i]+'"]').val()=='')n++;
	}
	for(i=ad;i<nfields;i++){
//for the remaining fields, if the field is prefilled, skip unless "show" condition is true
		if($('#'+formId+' [name="'+formFields[i]+'"]').val()!=''){
			if(!skipIfNotShown(formId, mySkipOptions, formFields[i])) n++;
		}else{
//for up to sd empty fields, only skip the field if a "hide" condition is true
			if (n < sd){
				var thisOption = 0;
				for (x in mySkipOptions) {
					if (x == formFields[i]) {
						thisOption = 1;
					}
				}
				if(thisOption){
					if(!skipIfHidden(formId, mySkipOptions, formFields[i])){
						n++;
//if this field is changed (the question is answered), show it on subsequent iterations.
//if an answered field disappears, it is confusing to the visitor, and will make them answer more questions.
						$('#'+formId+' [name="'+formFields[i]+'"]').change(function(){
							var thisfieldname = $(this).attr('name');
							newSkipOptions[thisfieldname] = {1: {action: 'show', depends: '', operator: 'always', condition: ''}};
						});
					}
				}else{
//since this field does not have a skip option, set it to always show on subsequent iterations
					n++; 
					newSkipOptions[formFields[i]] = {1: {action: 'show', depends: '', operator: 'always', condition: ''}};
				}
			}else{
				if(!skipIfNotShown(formId, mySkipOptions, formFields[i])) n++;
			}
		}
	}
//if the form is completely filled out and progressProAutoSubmit is true, auto-submit the form for convenience

	if(debugProgressPro) console.log('number of open fields: '+n);
	if (n == 0 && progressProAutoSubmit){ 
		$('#'+formId).submit();
	}

	return newSkipOptions;
}

function progressiveProfile(sd, ad, formId, formFields, popFields, elqDLKey_Cookie, elqDLKey_Email, emailField, channelField, validationOptions, skipOptions) {
//user-called function
//arguments:
//		sd: total number of unanswered questions to ask
//		ad: questions at the top of the form to always show even if answered
//		formId: the id of the progressive profiling form
//		formFields: an array form field names - these should be the same as the corresponding Eloqua database field name if there is one
//		popFields: an array of form field names that are to be pre-populated. These must correspond to an Eloqua database field name.
//		validationOptions: array containing options for jquery validation plugin, see http://docs.jquery.com/Plugins/Validation/
//		skipOptions: optional array of advanced skip/show rules -- for each field (indexed by the field names), specify these options:
//			action: "hide" or "show" the field if condition is true
//			depends: name of the field the value of which this rule depends on
//			operator: "eq" for equal to, "neq" for not equal to, "contains" or "always" (perform the action in all cases)
//			condition: value of "depends" field to conditionally evaluate
//				in other words, perform "action" on this field if the field "depends" (equals, does not equal, or contains) the value "condition"
//				example: {'C_AnyField':{action:'hide',depends:'C_MyField',operator:'neq',condition:'HR'},'C_AnotherField':{action:'hide',depends:'C_MyField',operator'eq',condition:'HR'}}
//					meaning hide field C_AnyField if field C_MyField is not "HR", and hide field C_AnotherField if field 'C_MyField' is "HR" 
    if(debugProgressPro) {
	    console.log('progressiveProfile called, skip options: ');
		console.dir(skipOptions);
	}

	oldValOptions = new Array();
    oldSkipOptions = new Array();
//deep copy validation and skip options so they can be reset if necessary
	$.extend(true, oldValOptions, validationOptions);
	$.extend(true, oldSkipOptions, skipOptions);
//validate the form using jquery.validate according to validationOptions
//if the form is already validated, then add the original rules to each field
	if(progressProValidator === 0) {
	    if(debugProgressPro) {
		    console.log('validating form with validation options: ');
		    console.dir(validationOptions);
		}
	    progressProValidator = $('#' + formId).validate(validationOptions);
	}else{
	    for (i in formFields) {
				var fieldName = formFields[i];
				for (field in validationOptions.rules){
					if (field == fieldName){ 
						$('#'+formId+' [name="'+formFields[i]+'"]').rules('add', validationOptions['rules'][fieldName]);
						if(debugProgressPro) console.log('added rules: ' + validationOptions['rules'][fieldName] + ' to field '+field);
					}
				}
			}
	}
	if(debugProgressPro) {
			for (i in formFields) {
				var fieldName = formFields[i];
				for (field in validationOptions.rules){
					if (field == fieldName){ 
					    console.log('field '+field+' has rules:');
						console.dir($('#'+formId+' [name="'+formFields[i]+'"]').rules());
					}
				}
			}
	}
//call proProgress to skip fields as specified and set new skip options so that the same fields are shown on subsequent iterations
    if(debugProgressPro) console.log('calling proProgress, old skip options:');
    if(debugProgressPro) console.dir(oldSkipOptions);
	skipOptions = proProgress(formId, sd, ad, oldSkipOptions,formFields);	
//if the email changes, re-process the form using the original skip options
	$('#'+formId+' [name="'+emailField+'"]').change(function() {
//reset the validation and skip options -- some rules may have been removed on previously skipped fields
        $.extend(true, skipOptions, oldSkipOptions);
		$.extend(true, validationOptions, oldValOptions);

// pre-populate the form again
        popByEmail(formId, $(this).val(), popFields, elqDLKey_Email, function(){
//re-process the form, updating the skipOptions and validation options again
			for (i in formFields) {
				var fieldName = formFields[i];
				for (field in validationOptions.rules){
					if (field == fieldName){ 
						$('#'+formId+' [name="'+formFields[i]+'"]').rules('add', validationOptions['rules'][fieldName]);
						if(debugProgressPro) console.log('added rules: ' + validationOptions['rules'][fieldName] + ' to field '+field);
					}
				}
			}
			if (channelField ) addChannel(formId, channelField);
			skipOptions = proProgress(formId, sd-1, ad, oldSkipOptions, formFields);
		});		
	});	
//if one of the "depends" fields in skipOptions changes, we need to re-process the form according to the new value of the field
//first determine which unique fields are specified as "depends" fields in skipOptions
	var uniqueDependFields = new Array();
	var unique = 1;
	for (m in skipOptions){
		for (n in skipOptions[m]){
			var d = skipOptions[m][n].depends;
			unique = 1;
			for(i in uniqueDependFields) {
				if (uniqueDependFields[i]==d) unique = 0;
			}
			if(unique==1 && d != '' && d != emailField) uniqueDependFields.push(d);
		}
	}
//for each unique "depends" field, re-process the form if the field is changed
	for (i in uniqueDependFields){
		d = uniqueDependFields[i];
		
	  if ($('#'+formId+' [name="'+d+'"]').attr('type') == 'radio') {
		$('#'+formId+' input[name="'+d+'"]').change(function() {
//reset the validation options -- some rules may have been removed on previously skipped fields
			$.extend(true, validationOptions, oldValOptions);
			for (i in formFields) {
				var fieldName = formFields[i];
				for (field in validationOptions.rules){
					if (field == fieldName){ 
						$('#'+formId+' [name="'+formFields[i]+'"]').rules('add', validationOptions['rules'][fieldName]);
						if(debugProgressPro) console.log('added rules: ' + validationOptions['rules'][fieldName] + ' to field '+field);
					}
				}
			}
			
			
//continue to show the "depends" field even if other rules might hide it -- hiding it now would confuse the visitor
//determine which field just changed:
			var chNum = $(this).attr('name');
 			skipOptions[chNum] = {1: {action: 'show', depends: '', operator: 'always', condition: ''}};
//re-process the form, updating the skipOptions again
			skipOptions = proProgress(formId, sd, ad, skipOptions, formFields);		
		});						
	  }else{
		$('#'+formId+' [name="'+d+'"]').change(function() {
			if(debugProgressPro) console.log('field changed');
//reset the validation options -- some rules may have been removed on previously skipped fields
			$.extend(true, validationOptions, oldValOptions);
			for (i in formFields) {
				var fieldName = formFields[i];
				for (field in validationOptions.rules){
					if (field == fieldName){ 
						$('#'+formId+' [name="'+formFields[i]+'"]').rules('add', validationOptions['rules'][fieldName]);
						if(debugProgressPro) console.log('added rules: ' + validationOptions['rules'][fieldName] + ' to field '+field);
					}
				}
			}
//continue to show the "depends" field even if other rules might hide it -- hiding it now would confuse the visitor
//determine which field just changed:
			var chNum = $(this).attr('name');
 			skipOptions[chNum] = {1: {action: 'show', depends: '', operator: 'always', condition: ''}};
//re-process the form, updating the skipOptions again
			skipOptions = proProgress(formId, sd, ad, skipOptions, formFields);		
		});
	  }
	}
}
