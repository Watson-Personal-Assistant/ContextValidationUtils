/*
© Copyright IBM Corp. 2017
*/

/**
 * @typedef {Object} Results
 * @property {Boolean} valid true if correctly processed, otherwise false.
 * @property {number} status HTTP status code - 200 code, 400, 404 errors
 * @property {string} msg A message describing error (400/404) or reporting success (200).
 * @property {Object} obj The updated object (remains unchanged in case of error).
 */

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
    

/**
 * This function can be used to get properties in the built-in context.
 *
 * @param    {Object}   obj
 *           The built-in context object.
 * @param    {string}   iPath
 *           The path to the property to get.  Dot notation is used.
 *
 * @return   {Results} 
 *           The results object (described above).
 */
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

/**
 * This function can be used to set properties in the built-in context.
 *
 * This function will not set a property if doing so makes the built-in context 
 * non-conformant with the built-in context schema.
 *
 * @param    {Object}   obj
 *           The built-in context object.
 * @param    {string}   iPath
 *           The path to the property to set.  Dot notation is used.
 * @param    {*}   iValue
 *           The value to set the property too.
 * @return   {Results} 
 *           The results object (described above).
 */
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
        let propExists = parentProperty.hasOwnProperty( fields[(fields.length - 1)]);
        let origProp = {};
        if (propExists)
        {
            origProp = JSON.parse(JSON.stringify(parentProperty[fields[(fields.length - 1)]]));
        }

        if (iValue.hasOwnProperty("leafValue"))
        {
            parentProperty[fields[(fields.length - 1)]] = iValue.leafValue;
        }
        else
        {
            parentProperty[fields[(fields.length - 1)]] = iValue;
        }
        
        let parseResults = validateBuiltinContext(obj);
        if (parseResults.valid === true )
        {
            results.valid = true;
            results.msg = "Successfully updated property";
            results.status = 200;
            results.obj = obj;
        }
        else
        {
            if (propExists)
            {
                parentProperty[fields[(fields.length - 1)]] = origProp;
            }
            else
            {
                delete parentProperty[fields[(fields.length - 1)]];
            }
            results.valid = false;
            results.msg = parseResults.errors;
            results.status = 400;
            results.obj = obj;
        }
    }
    return results;
}

function deleteSpecificProperty(fields, obj, parentProperty, results)
{
    if (parentProperty.hasOwnProperty(fields[ (fields.length - 1) ]))
    {
        let origProp = JSON.parse(JSON.stringify(parentProperty[fields[(fields.length - 1)]]));

        delete parentProperty[fields[(fields.length - 1)]];

        let parseResults = validateBuiltinContext(obj);
        if (parseResults.valid === true )
        {
            results.valid = true;
            results.msg = "Successfully deleted property";
            results.status = 200;
            results.obj = obj;
        }
        else
        {
            parentProperty[fields[(fields.length - 1)]] = origProp;
            results.valid = false;
            results.msg = parseResults.errors;
            results.status = 400;
            results.obj = obj;
        }
    }
    else
    {
        results.valid = false;
        results.msg = "Built-in context property does not exist."
        results.status = 404;
    }
    return;
}

/**
 * This function can be used to delete properties from the built-in context.
 *
 * This function will not delete a property if doing so makes the built-in context 
 * non-conformant with the built-in context schema.
 *
 * @param    {Object}   obj
 *           The built-in context object.
 * @param    {string}   iPath
 *           The path to the property to delete.  Dot notation is used.
 * @return   {Results} 
 *           The results object (described above).
 */
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

