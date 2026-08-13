"use strict";

const user = JSON.parse(
localStorage.getItem(
"coastConnectUser"
) || "null"
);

const container =
document.getElementById(
"workspaceOptions"
);

const logoutButton =
document.getElementById(
"logoutButton"
);

if(
!user ||
!Array.isArray(user.roles)
){

window.location.href="login.html";

}

const dashboards={

CUSTOMER:"index.html",

RESTAURANT_OWNER:
"restaurant-owner-dashboard.html",

PROVIDER:
"provider-dashboard.html",

RESTAURANT_STAFF:
"restaurant-staff-dashboard.html"

};

user.roles.forEach(role=>{

const button=
document.createElement("button");

button.textContent=
role
.replaceAll("_"," ");

button.onclick=()=>{

window.location.href=
dashboards[role];

};

container.appendChild(button);

});

logoutButton.onclick=()=>{

localStorage.removeItem(
"coastConnectToken"
);

localStorage.removeItem(
"coastConnectUser"
);

window.location.href=
"login.html";

};