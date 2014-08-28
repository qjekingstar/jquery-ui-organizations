+(function($,undefined){
	$(document).on("ui.organizations.children.toggle",".ui-organizations .children-toggle",function(){
		var that = this;
		if($(this).hasClass("glyphicon-minus-sign")){
			$(this).parent().next().add($(this).parent().parent().nextAll()).animate({opacity:0},"normal",function(){
				$(that).addClass("glyphicon-plus-sign").removeClass("glyphicon-minus-sign")
			});
		} else {
			$(this).parent().next().add($(this).parent().parent().nextAll()).animate({opacity:1},"normal",function(){
				$(that).addClass("glyphicon-minus-sign").removeClass("glyphicon-plus-sign");
			});
		}
	});
	$(document).on("click",".ui-organizations .children-toggle",function(){
		$(this).trigger("ui.organizations.children.toggle");
	});

	$(document).on("ui.organizations.node.repaint",".ui-organizations li",function(){
		var height = $(this).outerHeight();
		var all = $(this).parent().children("li");
		all.each(function(){
			height = Math.max($(this).outerHeight(),height);
		});
		var w = 0;
		all.each(function(){
			var children = $(this).children("ol").children("li");
			if(children.length){
				if(!$(this).children(".line").length){
					var line = $("<div class='line'><div class='glyphicon-pan'><a class='children-toggle glyphicon glyphicon-minus-sign text-info'></a></div><div class='line'></div></div>");
					$(this).children("span.panel:first").after(line);
					var lineH = $("<div class='line-h'></div>");
					line.after(lineH);
					var firstChild = $(children[0]);
					var lastChild = $(children[children.length-1]);
					var start = firstChild.position().left+firstChild.outerWidth()/2;
					if(children.length==1){
						lineH.css({
							width:3,
							border:"none",
							backgroundColor:"#3a87ad",
							marginLeft:"auto",
							marginRight:"auto"
						});
					} else {
						lineH.css({
							width:($(this).width()-lastChild.outerWidth()/2)-start,
							left:start
						});
						if(children.length > 2){
							children.each(function(i,e){
								if(i>0 && i<children.length-1){
									var childLine = $("<div class='line-h'></div>");
									lineH.append(childLine);
									var left = $(e).position().left - $(children[0]).position().left - $(children[0]).outerWidth()/2 + $(e).outerWidth()/2 -3
									childLine.css("left",left)
								}
							});
						}
					}
				}
			}
		});
		var parent = $(this).parent().parent();
		if(parent.is("li")){
			parent.trigger("ui.organizations.node.repaint");
		}
	});
	$.widget("ui.organizations", {
		version: "1.10.3",
		options: {
			root:{title: "Root Organization",attrs:{}},
			nodes:{},
			preRepaint:$.noop,
			repainted: $.noop,
			dragStart: $.noop,
			dragStop: $.noop,
			drag: $.noop,
			dragHandle: "",
			dropActivate:null,
			dropDeactivate:null,
			drop:$.noop,
			dropOut:null,
			dropOver:null,
			dropAccept: null,
			dropActiveClass: "panel-warning",
			dropHoverClass: "panel-danger",
			dropAddClasses: null,
		},
		_repaint: function(){
			var that = this;
			this.options.preRepaint($.Event("ui.organizations.preRapint"),this)
			$(this.element).find(".line").remove();
			$(this.element).find(".line-h").remove();
			var list = $(this.element).find("li");
			for(var i=0;i<list.length;i++){
				var li = $(list[i]);
				if(!li.find("li").length){
					li.parent().children("li:first").trigger("ui.organizations.node.repaint");
				}
			};
			this.options.repainted($.Event("ui.organizations.repainted"),this);
		},
		addNode: function(nodeId,nodeObject,ele,skipRepaint){
			var node = $("<li></li>");
			var spanHtml = '<span class="panel panel-default ';
			if(nodeObject.classname){
				spanHtml += nodeObject.classname;
			}
			spanHtml += '"';
			if(nodeObject.attrs){
				for(name in nodeObject.attrs){
					spanHtml += ' '+name+'="'+nodeObject.attrs[name]+'"';
				}
			}
			spanHtml +='></span>';
			var span = $(spanHtml);
			if(nodeObject.template){
				span.append($.tmpl(nodeObject.template,nodeObject.data));
			} else {
				span.html("<div class='panel-heading'>"+nodeObject.data.title+"</span>");
			}
			node.append(span);
			var childrenOL = $("<ol></ol>");
			span.attr("nodeId",nodeId);
			var children = nodeObject.children;
			if(children){
				for(id in children){
					this.addNode(id,children[id],childrenOL);
				}
			}
			node.append(childrenOL);
			var eleType = $.type(ele);
			if(eleType=="string"){
				ele = $(this.element).find("span[nodeId='"+ele+"']");
				while(ele.length && !ele.is("ol")){
					ele = ele.next();
				}
			} else {
				ele = $(ele);
			} 
			if(ele){
				ele.append(node);
			}
			if(!skipRepaint){
				this._bindAction();
				this._repaint();
			}
		},
		removeNode: function(node,confirmMethod,sync){
			if(node){
				var organizations = this;
				var nodeSelector = node;
				if($.type(nodeSelector)=="string"){
					node = $(organizations.element).find("span[nodeId='"+nodeSelector+"']");
					while(node.length && !node.is("li")){
						node = node.parent();
					}
					if(!node.length){
						node = $(nodeSelector);
					}
				} else {
					node = $(nodeSelector);
				}
				if(confirmMethod){
					if(sync){
						confirmMethod(function(){
							node.each(function(){
								$(this).remove();
							});
							organizations._repaint();
						});
					} else if(confirmMethod()){
						node.each(function(){
							$(this).remove();
						});
						organizations._repaint();
					}
				} else {
					node.each(function(){
						$(this).remove();
					});
					organizations._repaint();
				}
			}
		},
		_create: function() {
			if(this.options.href){
				$.getJSON(href,$.extend({},this.options.params),function(nodes){
					$.extend(this.options.nodes,nodes);
					this._initNodes();
				});
			} else {
				this._initNodes();
			}
		},
		_bindAction: function(){
			var organizations = this;
			var root = this.element.children("ol").children("li");
			root.draggable();
			var draggable = root.find("li");
			draggable.draggable({ 
				revert: "invalid",
				handle: "span.panel" + (organizations.dragHandle?">"+organizations.dragHandle:""),
				helper:"clone",
				cursorAt: {left:10},
				start: function(event, ui){
					if(organizations.options.dragStart(event,ui)!==false){
						ui.helper.find("span.panel").nextAll().hide();
						ui.helper.addClass("status-clone-dragging");
						$(this).addClass("status-dragging")
						return true;
					}
					return false;
				},
				stop: function(event,ui){
					if(organizations.options.dragStop(event,ui)!==false){
						ui.helper.removeClass("status-clone-dragging");
						$(this).removeClass("status-dragging")
						ui.helper.find("span.panel").nextAll().show();
						return true;
					}
					return false;
				},
				drag:organizations.options.drag || $.noop
			});
			var dropSettins = {
				activeClass: organizations.options.dropActiveClass || "panel-warning",
				hoverClass:  organizations.options.dropHoverClass || "panel-danger",
				drop: function( event, ui ) {
					if(organizations.options.drop(event,ui)!==false){
						ui.draggable.css({left:0,top:0});
						var ol = $(this);
						while(ol.next().length){
							ol = ol.next();
							if(ol.is("ol")){
								ol.append(ui.draggable[0]);
								ui.helper.remove();
								organizations._repaint();
								break;
							}
						}
					} else {
						return false;
					}
				}
			};
			if(organizations.options.dropActivate){
				dropSettins.activate = organizations.options.dropActivate;
			}
			if(organizations.options.dropDeactivate){
				dropSettins.deactivate=organizations.options.dropDeactivate;
			}
			if(organizations.options.out){
				dropSettins.out=organizations.options.out;
			}
			if(organizations.options.over){
				dropSettins.over=organizations.options.over;
			}
			if(organizations.options.dropActivate){
				dropSettins.activate = organizations.options.dropActivate;
			}
			if(organizations.dropAccept){
				dropSettins.accept=organizations.dropAccept;
			}
			if(organizations.dropAddClasses==false){
				dropSettins.addClasses=true;
			}
			var droppable = this.element.find("span.panel");
			droppable.droppable(dropSettins);
		},
		_initNodes: function(){
			var rootOL = $("<ol class='ui-organizations'></ol>");
			var rootHtml = '<li class="root"><span class="panel panel-default"';
			for(name in this.options.root.attrs){
				rootHtml += ' '+name+'="'+this.options.root.attrs[name]+'"';
			}
			rootHtml += '><div class="panel-heading">'+this.options.rootTitle+'</div></span></li>';
			var root = $(rootHtml);
			var sRoot = $("<ol></ol>");
			root.append(sRoot);
			rootOL.append(root);
			for(id in this.options.nodes){
				this.addNode(id,this.options.nodes[id],sRoot,true);
			}
			this.element.append(rootOL);
			this._bindAction();
			this._repaint();
		}
	});
})(jQuery);

