
import application = require('application');
import pages = require('ui/page');
import views = require('ui/core/view');
import frames = require('ui/frame');
import searchbar = require('ui/search-bar');
import actionbar = require('ui/action-bar');
import color = require('color');
import platform = require('platform');

import vuforia = require('nativescript-vuforia');
import argonBrowserView = require('argon-browser-view');

import Argon = require('argon');
import './argon-camera-service';
import './argon-device-service';
import './argon-viewport-service';
import {NativeScriptVuforiaServiceDelegate} from './argon-vuforia-service';

export let manager:Argon.ArgonSystem;
export let browserView:argonBrowserView.BrowserView;
let actionBar:actionbar.ActionBar;
let searchBar:searchbar.SearchBar;

let iosSearchBarController:IOSSearchBarController;

export function pageLoaded(args) {
	
	const container = new Argon.Container;
	container.registerSingleton(Argon.VuforiaServiceDelegate, NativeScriptVuforiaServiceDelegate);
	manager = Argon.init({container, config: {
		role: Argon.Role.MANAGER,
		defaultReality: {type: 'vuforia'}
	}});

    const page:pages.Page = args.object;
    page.backgroundColor = new color.Color("black");
	
	actionBar = page.actionBar;
	browserView = new argonBrowserView.BrowserView(page, manager);
	
	browserView.onNavigationStateChange = () => {
		const url = browserView.getURL();
		if (iosSearchBarController) {
			iosSearchBarController.setText(url);
		}
	}
	
	// workaround (see https://github.com/NativeScript/NativeScript/issues/659)
	if (page.ios) {
		setTimeout(()=>{
			page.requestLayout();
		}, 0)
		application.ios.addNotificationObserver(UIApplicationDidBecomeActiveNotification, () => {
			page.requestLayout();
		});
	}
}

export function actionBarLoaded(args) {
	actionBar = args.object
}

export function searchBarLoaded(args) {
	searchBar = args.object;
	
	searchBar.on(searchbar.SearchBar.submitEvent, () => {
		let url = searchBar.text; 
		const protocolRegex = /^[^:]+(?=:\/\/)/;
		if (!protocolRegex.test(url)) {
			url = "http://" + url;
		}
		url = url.toLowerCase();
		console.log("Load url: " + url);
		browserView.load(url);
	});

    if (application.ios) {
		iosSearchBarController = new IOSSearchBarController(searchBar);
	}
}

// initialize some properties of the menu so that animations will render correctly
export function menuLoaded(args) {
    let menu:views.View = args.object;
	menu.originX = 1;
    menu.originY = 0;
	menu.scaleX = 0;
    menu.scaleY = 0;
}

class IOSSearchBarController {
	
	private uiSearchBar:UISearchBar;
	private textField:UITextField;
	
	constructor(public searchBar:searchbar.SearchBar) {
    	this.uiSearchBar = searchBar.ios;
		this.textField = this.uiSearchBar.valueForKey("searchField");
		
    	this.uiSearchBar.showsCancelButton = false;
    	this.uiSearchBar.keyboardType = UIKeyboardType.UIKeyboardTypeURL;
		this.uiSearchBar.autocapitalizationType = UITextAutocapitalizationType.UITextAutocapitalizationTypeNone;
    	this.uiSearchBar.searchBarStyle = UISearchBarStyle.UISearchBarStyleMinimal;
		this.uiSearchBar.returnKeyType = UIReturnKeyType.UIReturnKeyGo;
		this.uiSearchBar.setImageForSearchBarIconState(UIImage.new(), UISearchBarIcon.UISearchBarIconSearch, UIControlState.UIControlStateNormal)
		
		this.textField.leftViewMode = UITextFieldViewMode.UITextFieldViewModeNever;

    	const textFieldEditHandler = () => {
    		if (this.uiSearchBar.isFirstResponder()) {
				this.uiSearchBar.setShowsCancelButtonAnimated(true, true);
				const cancelButton:UIButton = this.uiSearchBar.valueForKey("cancelButton");
				cancelButton.setTitleColorForState(UIColor.darkGrayColor(), UIControlState.UIControlStateNormal);
				
				const items = actionBar.actionItems.getItems();
				for (const item of items) {
					item.visibility = 'collapse'
				}
				setTimeout(()=>{
					if (this.uiSearchBar.text === "") {
						this.uiSearchBar.text = browserView.getURL();
						this.setPlaceholderText(null);
						this.textField.selectedTextRange = this.textField.textRangeFromPositionToPosition(this.textField.beginningOfDocument, this.textField.endOfDocument);
					}
				}, 500)
			} else {
				this.setPlaceholderText(this.uiSearchBar.text);
				this.uiSearchBar.text = "";
				Promise.resolve().then(()=>{
					this.setPlaceholderText(browserView.getURL());
					this.uiSearchBar.setShowsCancelButtonAnimated(false, true);
					const items = actionBar.actionItems.getItems();
					for (const item of items) {
						item.visibility = 'visible'
					}
				});
			}
    	}
		
    	application.ios.addNotificationObserver(UITextFieldTextDidBeginEditingNotification, textFieldEditHandler);
    	application.ios.addNotificationObserver(UITextFieldTextDidEndEditingNotification, textFieldEditHandler);	
	}
	
	private setPlaceholderText(text:string) {
		if (text) {
			var attributes = NSMutableDictionary.alloc().init();
			attributes.setObjectForKey(UIColor.blackColor(), NSForegroundColorAttributeName);
			this.textField.attributedPlaceholder = NSAttributedString.alloc().initWithStringAttributes(text, attributes);
		} else {
			this.textField.placeholder = searchBar.hint;
		}
	}
	
	public setText(url) {
		if (!this.uiSearchBar.isFirstResponder()) {
			this.setPlaceholderText(url);
		}
	}
	
}

export function menuButtonClicked(args) {
    let menu = views.getViewById(frames.topmost().currentPage, "menu");
        
    if (menu.visibility == "visible") {
        menu.animate({
            scale: { x: 0, y: 0 },
            duration: 150 
        }).then(() => { menu.visibility = "collapsed"; });
    } else {
        //make sure the menu view is rendered above any other views
        const parent = menu.parent;
        parent._removeView(menu);
        parent._addView(menu, 0);
        
        menu.visibility = "visible";
        menu.animate({
            scale: { x: 1, y: 1 },
            duration: 150 
        });
    }
}

export function newChannelClicked(args) {
    //code to open a new channel goes here
}

export function bookmarksClicked(args) {
    //code to open the bookmarks view goes here
}

export function historyClicked(args) {
    //code to open the history view goes here
}

export function settingsClicked(args) {
    //code to open the settings view goes here
}