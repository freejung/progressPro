Progress Pro is a script that uses jquery and data lookups to implement advanced progressive profiling for Eloqua 10.

You can download the script here: http://www.kpaonline.com/assets/js/progressPro.zip 

A form using this technique is here: http://www.kpaonline.com/hr.html?ch=topliners The easiest way to see the technique in action is to fill out the form and then simply refresh your browser window to fill it out again.

Progressive profiling is a technique whereby visitors are asked different questions each time they fill out a form.  The idea is to start by asking a few simple questions, for example email address and name, and gradually learn more about the visitor as they perform subsequent registrations. This reduces the barrier to entry into your marketing campaign, while still allowing you to collect detailed information on your most interested prospects.

The Problem:

Eloqua 10, while it has many advanced features, does not easily implement progressive profiling. There is a technique to perform progressive profiling using the Dynamic Content feature (see http://topliners.eloqua.com/community/do_it/blog/2011/06/08/progressive-profiling-in-eloqua10), but it has some limitations. 

Most importantly, it only works for visitors who have arrived by clicking through an email, since it uses the Dynamic Content feature. It will not work for visitors arriving on the landing page from a website or other channel. At KPA, we want to progressively profile website visitors who download our whitepapers and recorded webinars, as well as visitors for other channels and campaigns. 

Another disadvantage of the above technique is that it would be a lot of work to scale to multiple campaigns in multiple channels. For each nurturing process, you would have to create several different forms and track the progress through those forms in a separate contact field. Furthermore, it would be difficult to implement advanced conditional skipping rules, e.g. if the prospect indicates that they are interested in a particular product, only ask them subsequent questions about that product. 

The desired solution would work for visitors from any channel, use only one form, and enable advanced dynamic skip rules while still allowing easy implementation for simple use cases. It would dynamically pre-populate the form based on browser cookie or email address and ask questions conditionally according to the prospect's previous answers. Incidentally, it would also be useful to track the incoming channel and store it in a contact field. Pro Progress implements such a solution.

Methodology:

Eloqua has an amazingly awesome feature called Data Lookups. I won't go into the details, as the feature is well documented. This feature allows you to access data from your Eloqua database using javascript. Once you have data on the visitor, you can use javascript to manipulate the form accordingly. The methodology is:
	- Create a long form, beginning with email address, containing all of the questions you want to ask in the entire profiling process. Set the email address field to prefill, but don't make any of the fields required.
	- Create two data lookups: one for looking up the email address by tracking cookie, and one for looking up the rest of your data by email address. These lookups are performed by Progress Pro using jquery.getScript to load a script with appropriate parameters from Eloqua.
	- If the visitor comes in from an email, their email address will be prefilled. Progress Pro uses this to perform the lookup by email address and prefill the form with data accordingly.
	- If the vistor comes from another channel and has an Eloqua tracking cookie, Progress Pro performs a data lookup by cookie to get the email address, then performs another lookup by email address to get the rest of the data and prefill the form.
	- If neither of these is the case, the visitor will begin by filling in the email address field. Progress Pro attaches a jquery.change handler to the email field, and performs the lookup by email address once it has been filled in. If the visitor is not in the database, the rest of the form obviously stays empty.
	- Progress Pro then hides some of the questions on the form according to parameters you specify. In the basic setup, you simply specify a number of fields at the top of the form that should always be shown, and the number of unanswered questions you want to ask. Each time the visitor returns, they will be asked a new set of unanswered questions until they have completed the entire form.
	- For more advanced use cases, you can specify an array of conditional skip rules; e.g. if the prospect indicates interest in a particular product in the answer to one of the questions, skip all questions having to do with other products. These rules are implemented dynamically - as soon as the prospect selects an answer to the question on which the rule depends, the form immediately alters accordingly.
	- Progress Pro uses jquery.validate to validate the form. This is necessary because only visible fields can be required, or the form will always fail validation. You specify an initial set of validation rules, which are modified dynamically according to which fields are shown.
	- To track the incoming channel, you can use an optional URL parameter called "ch" - your form needs to contain an hidden field called "Channel History" which will be populated with whatever channel you specify in the URL. For example, if you go to this URL http://www.kpaonline.com/hr.html?ch=topliners and fill out the form, the channel "topliners" will be recorded in your channel history. 

Usage:

To use this script, first upload it to your website (or wherever else you want to host it - please don't hotlink our copy of the script, if you do I will find out and ask you very politely to stop). Then, in the <head> section of your landing page, add javascript code similar to the following:

//---------begin code-------------
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.0/jquery.min.js"></script> 
<script type="text/javascript" src="http://ajax.aspnetcdn.com/ajax/jquery.validate/1.8/jquery.validate.min.js"></script>
<script type="text/javascript" src="http://ajax.aspnetcdn.com/ajax/jquery.validate/1.8/additional-methods.js"></script>
<script type="text/javascript" src="http://www.mydomain.com/assets/js/progressPro.js"></script>//-----------end code--------------

This is to load the necessary script files. Obviously replace "mydomain" with your domain, and replace "assets/js" with the path to your copy of Progress Pro.

You will also need a script to tell the new Eloqua tracking scripts what your site ID is, like this:

//---------begin code-------------
<script type="text/javascript">
var elqSiteId = ####;
var _elqQ = _elqQ || [];
_elqQ.push(['elqSetSiteId', elqSiteId]);
</script> 
//-----------end code--------------

Where #### should be replaced with your actual Eloqua site id, which can be obtained by generating your normal Eloqua tracking code.

Then you set up a document.ready function to call the function prePop and prepopulate the form. You must specify the name of the field that contains the email address. As a callback from the prePop function, optionally call addChannel() to record the incoming channel in the Channel History field, and call the function progressiveProfile to hide fields as appropriate. Be sure to call the latter two functions as callbacks from prePop or they will not work.

In the most basic usage, just specify the number of unanswered questions to ask and the number of fixed questions to always show at the top. For this example we will set both to 3. A more advanced call using conditional skip rules is shown in the comments of the script itself. For basic usage, just specify the skip rules as an empty array.

You will need to provide the data lookup keys for your data lookup by cookie and by email. These will be generated by Eloqua when you set up the data lookups. You will also need to provide an array of form fields (indexed starting at 0) with the names of the database fields corresponding to each question. These names can be found in the fields setup in Eloqua. Also provide a set of jquery.validate validation rules (see http://docs.jquery.com/Plugins/validation). In this example, all fields are required.

//------------begin code--------------------------
<script type="text/javascript">
	$(document).ready(function() {	

		var elqDLKey_Cookie = escape('###');
		var elqDLKey_Email = escape('###');
		var theseFields = ['C_EmailAddress', 'C_FirstName', 'C_LastName', 'C_Company','C_Primary_Interest1', 'C_BusPhone', 'C_Website1', 'C_Lead_Role1', 'C_Function1', 'C_Title', 'C_Company_Type1', 'C_Project_Time_Frame1']; 
		var popFields = ['C_FirstName', 'C_LastName', 'C_Company','C_Primary_Interest1', 'C_BusPhone', 'C_Website1', 'C_Lead_Role1', 'C_Function1', 'C_Title', 'C_Company_Type1', 'C_Project_Time_Frame1'];
		var openQuestions = 4;
		var fixedQuestions = 1;
		var thisForm = 'form21';
        var channelField = 0;
        var emailField = 'C_EmailAddress';
        var visitorEmailField = 'V_ElqEmailAddress';
  		var myValidationRules = { rules: {C_FirstName: {required: true}, C_LastName: {required: true}, 
  					 C_Title: {required: true}, C_Company: {required: true}, C_Website1: {required: true},
					 C_Primary_Interest1: {required: true},C_Project_Time_Frame1: {required: true},C_Lead_Role1: {required: true},C_Function1: {required: true},C_Company_Type1: {required: true},
  					 C_BusPhone: { required: true, phoneUS: true }, C_EmailAddress: { required: true, email: true } } };
		var mySkipRules = {};
  		prePop(thisForm, theseFields, elqDLKey_Cookie, elqDLKey_Email, emailField, visitorEmailField, function(){
  			progressiveProfile(openQuestions, fixedQuestions, thisForm, theseFields, popFields, elqDLKey_Cookie, 
  										elqDLKey_Email, emailField, channelField, myValidationRules, mySkipRules);
  		});

  	});
  	</script>

//--------------end code-------------

For advanced usage, the skip rules are specified as an array. You set which field (by name) is to be hidden or shown, the field value the rule depends on, an operator, and a condition to match the "depends" field against. In other words, the rule states something like "hide this field if this other field contains 'California'" or perhaps "show this field if this other field equals 'yes'". You can specify multiple skip rules for each field. As a simple example, suppose we want to hide field 'C_HR_When1' if field 'C_Product_Family1' has the value "yes." The skip rule for this looks like:
//---------begin code-----------
var mySkipRules = {'C_HR_When1': {1: {action: 'hide', depends: 'C_Product_Family1', operator: 'eq', condition: 'yes'}}};
/----------end code ---------------
The possible actions are "hide" and "show" where show takes priority over hide if the rules contradict. The possible operators are "eq" for equals, "neq" for not equal to, "contains" and "always" - always means the action will always be taken regardless of the values of other fields.

A more advanced example is given in the script comments.


