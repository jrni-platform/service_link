## Service Linking example

Sometimes a business wants to link one service to another, so that in a custom journey, when picking one service they might suggest, or enforce other services are picked along side 

The App works by creating a new custom object, called a AddOnBundle, that currently contains a simple drop down selector of the type.

Each AddonBundle can then be assigned to many services. Each service in tern can also be assigned to an Add On Bundle

The App expands the Studio UI by adding a new page in the Service profile that updates the Bundles.

The details of which bundles a service supports are then exposed via the public API and you can use that to customise your own UI to control how clients book and if they book multiple services together.

Feel free to extend extra properties to the service bundle that give extra information, or control how the services are booked, such as setting for development time, or properties or who must book one services after another