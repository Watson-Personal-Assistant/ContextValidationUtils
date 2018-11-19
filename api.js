var jsValidate = require('jsonschema').validate;
const builtInSchema = require('./schemas/builtInSchema.json');

var iPathValidationRegex = /^[a-zA-Z0-9@\.]+$/;

/* Validate a JSON object against built-in schema. */
function validateBuiltinContext(obj) {
    return jsValidate(obj, builtInSchema);
}

function buildInvalidPathErrorMessage(fields, n)
{
    let path = ""
    
    if (n === 0)
    {
        path = fields[0];
    }
    else
    {
        let subpath = "";
        for (var i = 0; i < (n+1); i++)
        {
            subpath = subpath + fields[i] + ".";
        }
        path = subpath.substr(0, subpath.length-1);
    }

    let msg = "The field " + path + " does not exist in this user's built-in object.";
    return msg;
}


function validatePath(iPath)
{
    let results = {};
    if ( !iPathValidationRegex.test(iPath) )  
    {
        results.valid = false;
        results.msg = "Path did not pass validation checks.";
        results.status = 400;
    }
    return results;
}
    

/* Get property at iPath in object obj. */
function getProperty(obj, iPath)
{
    let sObj = obj;    
    
    let results = validatePath(iPath);

    if (results.hasOwnProperty('status'))
    {
    	return results;
    }
    
    let fields = iPath.split(".");


    for (var i = 0; i < fields.length; i++)
    {
        if (sObj.hasOwnProperty(fields[i]))
        {
            sObj = sObj[fields[i]];
        }
        else
        {            
            results.valid = false;
            results.msg = buildInvalidPathErrorMessage(fields, i);
            results.status = 400;
            return results;
        }
    }

    results.msg = "Success";
    results.valid = true;
    results.value = sObj;
    return results;
}

/* Get the parent property of fields in sObj.*/
function getParentProperty(fields, sObj, results)
{
    for (var i = 0; i < (fields.length - 1); i++)
    {
        if (sObj.hasOwnProperty(fields[i]))
        {
            sObj = sObj[fields[i]];
        }
        else
        {
            results.valid = false;
            results.msg = buildInvalidPathErrorMessage(fields, i);
            results.status = 404;
            break;
        }
    }
    return sObj;
}

/* Update obj by setting property at iPath to iValue. */
function setProperty(obj, iPath, iValue) {
    let results = validatePath(iPath);

    if (results.hasOwnProperty('status'))
    {
    	return results;
    }
    
    let fields = iPath.split(".");

    let parentProperty = getParentProperty(fields, obj, results);


    if (results.hasOwnProperty('status') === false)
    {
		if (iValue.hasOwnProperty("leafValue"))
		{
			parentProperty[fields[(fields.length - 1)]] = iValue.leafValue;
		}
		else
		{
			parentProperty[fields[(fields.length - 1)]] = iValue;
		}

		results.valid = true;
		results.msg = "Success";
		results.obj = obj;
    }
    return results;
}

function deleteSpecificProperty(fields, obj, parentProperty, results)
{
	if (parentProperty.hasOwnProperty(fields[ (fields.length - 1) ]))
	{
		delete parentProperty[fields[(fields.length - 1)]];

		results.valid = true;
		results.msg = "Success";
		results.status = 200;
		results.obj = obj;

	}
	else
	{
		results.valid = false;
		results.msg = "Built-in context property does not exist."
		results.status = 404;
	}
	return;
}

/* Delete property at iPath from obj. */
function deleteProperty(obj, iPath)
{
    let results = validatePath(iPath);

    if (results.hasOwnProperty('status'))
    {
    	return results;
    }

    let fields = iPath.split(".");

    parentProperty = getParentProperty(fields, obj, results);

    if (!results.hasOwnProperty('status'))
    {
        deleteSpecificProperty(fields, obj, parentProperty, results);
    }

    return results;
}

module.exports = {
    validateBuiltinContext: validateBuiltinContext,
    getProperty : getProperty,
    setProperty : setProperty,
    deleteProperty : deleteProperty
};

