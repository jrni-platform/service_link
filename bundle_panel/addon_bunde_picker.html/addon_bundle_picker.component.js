import template from './addon_bundle_picker.html';

import Configurator from 'bookingbug-configurator-js';
import './addon_bundle_picker.scss';
import { bbAuthorisation } from 'bookingbug-core-js';


// add a new page for lets you select an add on bundle for a service
Configurator.addPage('Services', 'addon_bundle_picker', { 
    style: 'tab',
    layout: [
        [
          {
            type: 'bb-addon-bundle-picker-panel',
            width: 12,
            index: 0,
            panel_params: {
            }
          }
        ]
    ]
});

// Add it to the service profile
Configurator.addNamedTab('service_profile', { 
    name: 'Addon Bundles',
    path: '.views({view: "addon_bundle_picker"})',
    position: -1
});



class AddonBundlePickerCtrl {
    constructor($timeout) {
        this.$timeout = $timeout;
        this.company = bbAuthorisation.getCompany();

        // get the current service from the filter that is passed in
        this.service = this.filter.service;
        this.enabledItems = {};
        this.unsavedChanges = false;

        this.getServices(); 
    }

    async getServices(){
        try {

            // get the app
            this.app = await this.company.$get('apps', {app_name: 'service_link' });

            // get the existing add on if there is one
            if (this.service.$has('service_link.addon_bundle'))
                this.addon_bundle = await this.service.$get('service_link.addon_bundle')


            // get all services
            this.services = (await this.company.$getServices()).items

            // keep two maps of the exisiting services - one by id, and another by href
            this.services_by_id = {};
            this.services.map( service => this.services_by_id[service.id] = service );
            this.services_by_href = {};
            this.services.map( service => this.services_by_href[service.$href('self')] = service );
            this.addon_bundle_maps_by_service = {};

            if (this.addon_bundle){
                //now get the addon_bundle maps
                // the maps are a simple object that maps add on bundles, to services, simulating a many-to-many relationhs - since we don't suppor that natively as a type yet
                // flush it and fetch it and unwrap the collection of custom objects
                this.addon_bundle.$flush('service_link.addon_bundle_maps');
                const addon_bundle_service_maps = await (await this.addon_bundle.$get('service_link.addon_bundle_maps')).$get('custom_objects');
                // create a handy map of service maps by the href of service they match to

                /// go round the service maps we loaded for this service. keep some handy refernces and also set an enabled variable for each one that is enabled
                addon_bundle_service_maps.map( (addon_bundle_map) => {
                    if (addon_bundle_map.$href('bb.service')){
                        this.addon_bundle_maps_by_service[addon_bundle_map.$href('bb.service')] = addon_bundle_map;
                        const service = this.services_by_href[addon_bundle_map.$href('bb.service')];
                        this.enabledItems[service.id] = true;
                    }
                });
            }

        } catch (err) {
            console.error(err);
        }
    }

    enableAddons() {
        this.addon_bundle = {
            "bb.service_id": this.service.id
        };
    }

    toggleItem(id) {
        this.enabledItems[id] = !this.enabledItems[id];
        this.unsavedChanges = true;
        this.showSuccessMessage = false;
    }

    /**
     * Check if the name passed in contains the search filter
     * @param {string} name The name of the toggleable item.
     * @returns {boolean} True if the name contains the search filter string.
     */
    matchesFilter(name) {
        return name.toLowerCase().indexOf(this.search.toLowerCase()) !== -1;
    }    


    /**
     * Updates the service map entries on the service, either creating or deleteing them as needed
     */
    async save() {
        try {


            // if we've not previous saved this add on bundle
            if (!this.addon_bundle.id){
                this.addon_bundle = await this.app.$post('addon_bundles', {}, this.addon_bundle)
            } else {
                // resave it - just in case you changed the bundle type
                this.addon_bundle = await this.addon_bundle.$put('self', {}, this.addon_bundle)
            }

            // go round and save all of the enabled times
            for (const key in this.enabledItems) {
                const href = this.services_by_id[key].$href('self');
                if (this.enabledItems[key]){

                    // get the href of the service
                    if (!this.addon_bundle_maps_by_service[href]) {
                        // if there's no entry for this one already - add one
                        const new_map = await this.addon_bundle.$post('service_link.addon_bundle_maps', {}, {"bb.service_id": key})
                        this.addon_bundle_maps_by_service[href] = new_map;
                    }
                } else {
                    // check if there IS an entry for this one
                    if (this.addon_bundle_maps_by_service[href]) {
                        // and if there is - delete it
                        await this.addon_bundle_maps_by_service[href].$del('self');
                        delete this.addon_bundle_maps_by_service[key];
                    }

                }
            }
            this.unsavedChanges = false;
            this.showSuccessMessage = true;
            this.$timeout(() => {
                this.showSuccessMessage = false;
            }, 3000);

        } catch (err) {
            console.error(err);
        }
    }

  
}

const addonBundlePickerPanel = {
    templateUrl: template.id,
    controller: AddonBundlePickerCtrl,
    scope: true,
    bindings: {
        filter: '<'
    }
};

angular
    .module('BBAdminDashboard')
    .component('bbAddonBundlePickerPanel', addonBundlePickerPanel);
