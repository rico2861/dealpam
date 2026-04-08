"""
DEALPAM v5.0 — Backend Flask complet
Admin + Client API | SQLite | JWT Auth
"""
from flask import Flask, request, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.security import generate_password_hash as _gph, check_password_hash
from datetime import date, timedelta, datetime
from functools import wraps
import random, string, traceback, os

def gen_hash(p): return _gph(p, method='pbkdf2:sha256')

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI='sqlite:///dealpam.db',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY='DEALPAM_MASTER_SECRET_2025',
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    MAX_CONTENT_LENGTH=16 * 1024 * 1024
)
CORS(app, resources={r"/api/*": {"origins": "*"}})
db  = SQLAlchemy(app)
jwt = JWTManager(app)

# ══════════════════════════════════════════════════
# MODELS
# ══════════════════════════════════════════════════
class User(db.Model):
    __tablename__ = 'users'
    id                    = db.Column(db.Integer, primary_key=True)
    name                  = db.Column(db.String(120), nullable=False)
    email                 = db.Column(db.String(120), unique=True, nullable=False)
    password              = db.Column(db.String(255), nullable=False)
    role                  = db.Column(db.String(30), default='Vendeur')  # Admin|Vendeur|Comptable|Client
    phone                 = db.Column(db.String(30), default='')
    address               = db.Column(db.String(255), default='')
    city                  = db.Column(db.String(100), default='')
    active                = db.Column(db.Boolean, default=True)
    force_password_change = db.Column(db.Boolean, default=False)
    temp_password         = db.Column(db.String(50), default='')
    avatar_color          = db.Column(db.String(20), default='#8B5CF6')
    created_at            = db.Column(db.String(10), default=lambda: date.today().isoformat())

    def to_dict(self, public=False):
        d = dict(id=self.id, name=self.name, email=self.email, role=self.role,
                 phone=self.phone or '', address=self.address or '',
                 city=self.city or '', active=self.active,
                 avatarColor=self.avatar_color or '#8B5CF6',
                 createdAt=self.created_at,
                 forcePasswordChange=bool(self.force_password_change))
        return d


class Category(db.Model):
    __tablename__ = 'categories'
    id   = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    icon = db.Column(db.String(10), default='🏷')
    def to_dict(self):
        return dict(id=self.id, name=self.name, icon=self.icon)


class Product(db.Model):
    __tablename__ = 'products'
    id           = db.Column(db.Integer, primary_key=True)
    sku          = db.Column(db.String(60), default='')
    name         = db.Column(db.String(200), nullable=False)
    description  = db.Column(db.Text, default='')
    category     = db.Column(db.String(80), default='')
    qty          = db.Column(db.Integer, default=0)
    alert_qty    = db.Column(db.Integer, default=2)
    cost         = db.Column(db.Float, default=0.0)
    price        = db.Column(db.Float, default=0.0)
    image_url    = db.Column(db.String(500), default='')
    featured     = db.Column(db.Boolean, default=False)
    active       = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.String(10), default=lambda: date.today().isoformat())

    def to_dict(self, rate=136):
        p = self.price or 0; c = self.cost or 0
        mg = round(((p-c)/p*100)) if p > 0 else 0
        return dict(id=self.id, sku=self.sku or '', name=self.name,
                    description=self.description or '', category=self.category or '',
                    qty=self.qty or 0, alertQty=self.alert_qty or 2,
                    cost=round(c,2), price=round(p,2),
                    priceHTG=round(p*rate), costHTG=round(c*rate),
                    margin=mg, imageUrl=self.image_url or '',
                    featured=bool(self.featured), active=bool(self.active),
                    inStock=(self.qty or 0) > 0,
                    createdAt=self.created_at)


class Client(db.Model):
    __tablename__ = 'clients'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(150), nullable=False)
    phone      = db.Column(db.String(30), default='')
    email      = db.Column(db.String(120), default='')
    address    = db.Column(db.String(255), default='')
    city       = db.Column(db.String(100), default='')
    country    = db.Column(db.String(80), default='Haïti')
    id_type    = db.Column(db.String(50), default='')
    id_number  = db.Column(db.String(80), default='')
    notes      = db.Column(db.Text, default='')
    user_id    = db.Column(db.Integer, nullable=True)  # linked user account
    created_at = db.Column(db.String(10), default=lambda: date.today().isoformat())

    def to_dict(self, rate=136, nb_sales=0, total=0.0, paid=0.0):
        bal = total - paid
        return dict(id=self.id, name=self.name, phone=self.phone or '',
                    email=self.email or '', address=self.address or '',
                    city=self.city or '', country=self.country or 'Haïti',
                    idType=self.id_type or '', idNumber=self.id_number or '',
                    notes=self.notes or '', userId=self.user_id,
                    createdAt=self.created_at,
                    totalSales=nb_sales, totalUSD=round(total,2),
                    totalHTG=round(total*rate), balanceUSD=round(bal,2),
                    balanceHTG=round(bal*rate))


class Sale(db.Model):
    __tablename__ = 'sales'
    id             = db.Column(db.Integer, primary_key=True)
    date           = db.Column(db.String(10), nullable=False)
    client_id      = db.Column(db.Integer, nullable=True)
    client_name    = db.Column(db.String(150), default='Client direct')
    product_id     = db.Column(db.Integer, nullable=True)
    product_name   = db.Column(db.String(200), default='')
    qty            = db.Column(db.Integer, default=1)
    unit_price     = db.Column(db.Float, default=0.0)
    total_usd      = db.Column(db.Float, default=0.0)
    paid_usd       = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50), default='Cash')
    notes          = db.Column(db.Text, default='')
    status         = db.Column(db.String(20), default='completed')  # pending|completed|cancelled
    created_by     = db.Column(db.Integer, nullable=True)
    created_at     = db.Column(db.String(10), default=lambda: date.today().isoformat())

    def to_dict(self, rate=136):
        t=self.total_usd or 0; p=self.paid_usd or 0; u=self.unit_price or 0
        return dict(id=self.id, date=self.date,
                    clientId=self.client_id, clientName=self.client_name or '',
                    productId=self.product_id, productName=self.product_name or '',
                    qty=self.qty or 1, unitPrice=round(u,2), unitPriceHTG=round(u*rate),
                    totalUSD=round(t,2), totalHTG=round(t*rate),
                    paidUSD=round(p,2), paidHTG=round(p*rate),
                    balanceUSD=round(t-p,2), balanceHTG=round((t-p)*rate),
                    paymentMethod=self.payment_method or 'Cash',
                    notes=self.notes or '', status=self.status or 'completed',
                    createdAt=self.created_at)


class Expense(db.Model):
    __tablename__ = 'expenses'
    id             = db.Column(db.Integer, primary_key=True)
    date           = db.Column(db.String(10), nullable=False)
    category       = db.Column(db.String(80), default='Autre')
    description    = db.Column(db.String(255), nullable=False)
    amount         = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50), default='Cash')
    notes          = db.Column(db.Text, default='')
    created_by     = db.Column(db.Integer, nullable=True)
    created_at     = db.Column(db.String(10), default=lambda: date.today().isoformat())

    def to_dict(self, rate=136):
        a = self.amount or 0
        return dict(id=self.id, date=self.date, category=self.category or '',
                    description=self.description, amount=round(a,2),
                    amountHTG=round(a*rate), paymentMethod=self.payment_method or 'Cash',
                    notes=self.notes or '', createdAt=self.created_at)


class Order(db.Model):
    """Client orders from the client portal"""
    __tablename__ = 'orders'
    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, nullable=False)
    client_name    = db.Column(db.String(150), default='')
    items          = db.Column(db.Text, default='[]')  # JSON
    total_usd      = db.Column(db.Float, default=0.0)
    status         = db.Column(db.String(20), default='pending')
    notes          = db.Column(db.Text, default='')
    created_at     = db.Column(db.String(19), default=lambda: datetime.now().isoformat()[:19])

    def to_dict(self, rate=136):
        import json
        try: items = json.loads(self.items)
        except: items = []
        return dict(id=self.id, userId=self.user_id, clientName=self.client_name,
                    items=items, totalUSD=round(self.total_usd,2),
                    totalHTG=round((self.total_usd or 0)*rate),
                    status=self.status, notes=self.notes, createdAt=self.created_at)


class Setting(db.Model):
    __tablename__ = 'settings'
    id            = db.Column(db.Integer, primary_key=True)
    company_name  = db.Column(db.String(120), default='DEALPAM')
    slogan        = db.Column(db.String(200), default='Parfums d\'exception')
    exchange_rate = db.Column(db.Float, default=136.0)
    currency      = db.Column(db.String(10), default='USD')
    address       = db.Column(db.String(255), default='Port-au-Prince, Haïti')
    phone         = db.Column(db.String(30), default='')
    email         = db.Column(db.String(120), default='')
    logo_url      = db.Column(db.String(500), default='')
    hero_text     = db.Column(db.String(300), default='Collection exclusive de parfums Zara')
    def to_dict(self):
        return dict(companyName=self.company_name, slogan=self.slogan,
                    exchangeRate=self.exchange_rate, currency=self.currency,
                    address=self.address or '', phone=self.phone or '',
                    email=self.email or '', logoUrl=self.logo_url or '',
                    heroText=self.hero_text or '')

# ══════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════
def rate():  s=Setting.query.first(); return float(s.exchange_rate) if s else 136.0
def me(): uid=get_jwt_identity(); return db.session.get(User, int(uid)) if uid else None
def today(): return date.today().isoformat()
def ok(d,c=200): return jsonify(d),c
def err(m,c=400): return jsonify(error=m),c
def gen_pw(): return ''.join(random.choices(string.ascii_letters+string.digits,k=8))

def role_required(*roles):
    def dec(fn):
        @wraps(fn)
        @jwt_required()
        def wrap(*a,**kw):
            u=me()
            if not u: return err('Non authentifié',401)
            if roles and u.role not in roles: return err('Accès refusé',403)
            g.user=u
            return fn(*a,**kw)
        return wrap
    return dec

# ══════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        d=request.get_json() or {}
        email=(d.get('email') or '').strip().lower()
        pw=d.get('password') or ''
        if not email or not pw: return err('Email et mot de passe requis')
        u=User.query.filter(db.func.lower(User.email)==email,User.active==True).first()
        if not u or not check_password_hash(u.password,pw): return err('Identifiants incorrects',401)
        token = create_access_token(identity=str(u.id))
        return ok({'token':token,'user':u.to_dict(),'forcePasswordChange':bool(u.force_password_change)})
    except: traceback.print_exc(); return err('Erreur serveur',500)

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Self-registration for clients only"""
    try:
        d=request.get_json() or {}
        name=d.get('name','').strip()
        email=(d.get('email') or '').strip().lower()
        pw=d.get('password') or ''
        if not name or not email or not pw: return err('Nom, email et mot de passe requis')
        if len(pw)<6: return err('Minimum 6 caractères')
        if User.query.filter(db.func.lower(User.email)==email).first(): return err('Email déjà utilisé')
        u=User(name=name,email=email,password=gen_hash(pw),role='Client',
               phone=d.get('phone',''),address=d.get('address',''),active=True)
        db.session.add(u); db.session.commit()
        # Create client record
        c=Client(name=name,email=email,phone=d.get('phone',''),user_id=u.id)
        db.session.add(c); db.session.commit()
        token=create_access_token(identity=u.id)
        return ok({'token':token,'user':u.to_dict()},201)
    except: traceback.print_exc(); return err('Erreur serveur',500)

@app.route('/api/auth/me')
@jwt_required()
def auth_me():
    u=me(); return ok(u.to_dict()) if u else err('Introuvable',404)

@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_pw():
    try:
        u=me(); d=request.get_json() or {}
        cur=d.get('currentPassword') or d.get('current') or ''
        new=d.get('newPassword') or d.get('new') or ''
        if not check_password_hash(u.password,cur): return err('Mot de passe actuel incorrect')
        if len(new)<6: return err('Minimum 6 caractères')
        u.password=gen_hash(new); u.force_password_change=False; u.temp_password=''
        db.session.commit(); return ok({'success':True})
    except: traceback.print_exc(); return err('Erreur',500)

# ══════════════════════════════════════════════════
# PUBLIC — Products (for client portal)
# ══════════════════════════════════════════════════
@app.route('/api/public/products')
def public_products():
    try:
        r=rate(); q=(request.args.get('q') or '').lower(); cat=request.args.get('category','')
        ps=Product.query.filter_by(active=True).order_by(Product.featured.desc(),Product.name).all()
        if q: ps=[p for p in ps if q in p.name.lower() or q in (p.description or '').lower() or q in (p.category or '').lower()]
        if cat: ps=[p for p in ps if p.category==cat]
        return ok([p.to_dict(r) for p in ps])
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/public/categories')
def public_cats():
    cats=db.session.query(Product.category).filter(Product.active==True).distinct().all()
    return ok([c[0] for c in cats if c[0]])

@app.route('/api/public/settings')
def public_settings():
    s=Setting.query.first(); return ok(s.to_dict() if s else {})

# ══════════════════════════════════════════════════
# ORDERS (client portal)
# ══════════════════════════════════════════════════
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        import json; u=me(); d=request.get_json() or {}
        if u.role not in ('Client','Admin','Vendeur'): return err('Accès refusé',403)
        items=d.get('items',[])
        if not items: return err('Panier vide')
        total=sum((i.get('price',0))*(i.get('qty',1)) for i in items)
        o=Order(user_id=u.id,client_name=u.name,items=json.dumps(items),
                total_usd=total,status='pending',notes=d.get('notes',''))
        db.session.add(o); db.session.commit()
        return ok(o.to_dict(rate()),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/orders/my')
@jwt_required()
def my_orders():
    u=me(); orders=Order.query.filter_by(user_id=u.id).order_by(Order.id.desc()).all()
    return ok([o.to_dict(rate()) for o in orders])

@app.route('/api/orders')
@role_required('Admin','Vendeur','Comptable')
def all_orders():
    r=rate(); orders=Order.query.order_by(Order.id.desc()).all()
    return ok([o.to_dict(r) for o in orders])

@app.route('/api/orders/<int:oid>/status', methods=['PUT'])
@role_required('Admin','Vendeur')
def update_order_status(oid):
    o=db.session.get(Order,oid)
    if not o: return err('Introuvable',404)
    d=request.get_json() or {}
    o.status=d.get('status','pending'); db.session.commit()
    return ok(o.to_dict(rate()))

# ══════════════════════════════════════════════════
# PRODUCTS (admin)
# ══════════════════════════════════════════════════
@app.route('/api/products')
@jwt_required()
def get_products():
    try:
        r=rate(); q=(request.args.get('q') or '').lower()
        ps=Product.query.order_by(Product.featured.desc(),Product.name).all()
        if q: ps=[p for p in ps if q in p.name.lower() or q in (p.sku or '').lower() or q in (p.category or '').lower()]
        cat=request.args.get('category','')
        if cat: ps=[p for p in ps if p.category==cat]
        return ok([p.to_dict(r) for p in ps])
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/products/categories')
@jwt_required()
def product_cats():
    cats=db.session.query(Product.category).distinct().all()
    return ok([c[0] for c in cats if c[0]])

@app.route('/api/products', methods=['POST'])
@jwt_required()
def add_product():
    try:
        d=request.get_json() or {}
        if not d.get('name'): return err('Nom requis')
        p=Product(sku=d.get('sku',''),name=d['name'],description=d.get('description',''),
                  category=d.get('category',''),qty=int(d.get('qty',0)),
                  alert_qty=int(d.get('alertQty',2)),cost=float(d.get('cost',0)),
                  price=float(d.get('price',0)),image_url=d.get('imageUrl',''),
                  featured=bool(d.get('featured',False)),active=True)
        db.session.add(p); db.session.commit(); return ok(p.to_dict(rate()),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/products/<int:pid>', methods=['PUT'])
@jwt_required()
def upd_product(pid):
    try:
        p=db.session.get(Product,pid)
        if not p: return err('Introuvable',404)
        d=request.get_json() or {}
        for f,a in [('name','name'),('sku','sku'),('description','description'),('category','category'),('imageUrl','image_url')]:
            if f in d: setattr(p,a,d[f])
        if 'qty'      in d: p.qty=int(d['qty'])
        if 'alertQty' in d: p.alert_qty=int(d['alertQty'])
        if 'cost'     in d: p.cost=float(d['cost'])
        if 'price'    in d: p.price=float(d['price'])
        if 'featured' in d: p.featured=bool(d['featured'])
        if 'active'   in d: p.active=bool(d['active'])
        db.session.commit(); return ok(p.to_dict(rate()))
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/products/<int:pid>', methods=['DELETE'])
@role_required('Admin')
def del_product(pid):
    p=db.session.get(Product,pid)
    if not p: return err('Introuvable',404)
    db.session.delete(p); db.session.commit(); return ok({'success':True})

# ══════════════════════════════════════════════════
# CLIENTS
# ══════════════════════════════════════════════════
@app.route('/api/clients')
@jwt_required()
def get_clients():
    try:
        r=rate(); q=(request.args.get('q') or '').lower()
        cs=Client.query.order_by(Client.name).all()
        if q: cs=[c for c in cs if q in c.name.lower() or q in (c.phone or '') or q in (c.email or '').lower()]
        all_sales=Sale.query.all()
        result=[]
        for c in cs:
            csales=[s for s in all_sales if s.client_id==c.id]
            total=sum(s.total_usd or 0 for s in csales); paid=sum(s.paid_usd or 0 for s in csales)
            result.append(c.to_dict(r,len(csales),total,paid))
        return ok(result)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/clients', methods=['POST'])
@jwt_required()
def add_client():
    try:
        d=request.get_json() or {}
        if not d.get('name'): return err('Nom requis')
        c=Client(name=d['name'],phone=d.get('phone',''),email=d.get('email',''),
                 address=d.get('address',''),city=d.get('city',''),country=d.get('country','Haïti'),
                 id_type=d.get('idType',''),id_number=d.get('idNumber',''),notes=d.get('notes',''))
        db.session.add(c); db.session.commit(); return ok(c.to_dict(rate()),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/clients/<int:cid>', methods=['PUT'])
@jwt_required()
def upd_client(cid):
    try:
        c=db.session.get(Client,cid)
        if not c: return err('Introuvable',404)
        d=request.get_json() or {}
        for f in ['name','phone','email','address','city','country','notes']:
            if f in d: setattr(c,f,d[f])
        if 'idType'   in d: c.id_type=d['idType']
        if 'idNumber' in d: c.id_number=d['idNumber']
        db.session.commit(); return ok(c.to_dict(rate()))
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/clients/<int:cid>', methods=['DELETE'])
@role_required('Admin')
def del_client(cid):
    c=db.session.get(Client,cid)
    if not c: return err('Introuvable',404)
    db.session.delete(c); db.session.commit(); return ok({'success':True})

# ══════════════════════════════════════════════════
# SALES
# ══════════════════════════════════════════════════
@app.route('/api/sales')
@jwt_required()
def get_sales():
    try:
        r=rate(); u=me(); q=(request.args.get('q') or '').lower()
        sales=Sale.query
        if u and u.role=='Vendeur': sales=sales.filter_by(created_by=u.id)
        sales=sales.order_by(Sale.date.desc()).all()
        if q: sales=[s for s in sales if q in (s.client_name or '').lower() or q in (s.product_name or '').lower()]
        st=request.args.get('status')
        if st=='paid': sales=[s for s in sales if (s.paid_usd or 0)>=(s.total_usd or 0)]
        if st=='due':  sales=[s for s in sales if (s.paid_usd or 0)<(s.total_usd or 0)]
        return ok([s.to_dict(r) for s in sales])
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/sales', methods=['POST'])
@jwt_required()
def add_sale():
    try:
        r=rate(); u=me(); d=request.get_json() or {}
        if not d.get('productId') or not d.get('date'): return err('Produit et date requis')
        prod=db.session.get(Product,int(d['productId']))
        qty=int(d.get('qty',1))
        if prod:
            if (prod.qty or 0)<qty: return err(f'Stock insuffisant — disponible: {prod.qty or 0}')
            prod.qty=(prod.qty or 0)-qty
        cn=d.get('clientName') or 'Client direct'
        cid=int(d['clientId']) if d.get('clientId') else None
        if cid:
            cl=db.session.get(Client,cid)
            if cl: cn=cl.name
        s=Sale(date=d['date'],client_id=cid,client_name=cn,
               product_id=int(d['productId']),product_name=prod.name if prod else '',
               qty=qty,unit_price=float(d.get('unitPrice',0)),
               total_usd=float(d.get('totalUSD',0)),paid_usd=float(d.get('paidUSD',0)),
               payment_method=d.get('paymentMethod','Cash'),notes=d.get('notes',''),
               status=d.get('status','completed'),created_by=u.id if u else None)
        db.session.add(s); db.session.commit(); return ok(s.to_dict(r),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/sales/<int:sid>', methods=['PUT'])
@jwt_required()
def upd_sale(sid):
    try:
        s=db.session.get(Sale,sid)
        if not s: return err('Introuvable',404)
        u=me()
        if u and u.role=='Vendeur' and s.created_by!=u.id: return err('Accès refusé',403)
        d=request.get_json() or {}
        for f,a in [('date','date'),('clientName','client_name'),('notes','notes'),('paymentMethod','payment_method'),('status','status')]:
            if f in d: setattr(s,a,d[f])
        if 'paidUSD'   in d: s.paid_usd=float(d['paidUSD'])
        if 'totalUSD'  in d: s.total_usd=float(d['totalUSD'])
        if 'unitPrice' in d: s.unit_price=float(d['unitPrice'])
        if 'qty'       in d: s.qty=int(d['qty'])
        db.session.commit(); return ok(s.to_dict(rate()))
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/sales/<int:sid>', methods=['DELETE'])
@role_required('Admin')
def del_sale(sid):
    s=db.session.get(Sale,sid)
    if not s: return err('Introuvable',404)
    db.session.delete(s); db.session.commit(); return ok({'success':True})

# ══════════════════════════════════════════════════
# EXPENSES
# ══════════════════════════════════════════════════
@app.route('/api/expenses')
@role_required('Admin','Comptable')
def get_expenses():
    try:
        r=rate(); q=(request.args.get('q') or '').lower()
        cat=request.args.get('category','')
        es=Expense.query.order_by(Expense.date.desc()).all()
        if q: es=[e for e in es if q in e.description.lower() or q in (e.category or '').lower()]
        if cat: es=[e for e in es if e.category==cat]
        return ok([e.to_dict(r) for e in es])
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/expenses', methods=['POST'])
@role_required('Admin','Comptable')
def add_expense():
    try:
        d=request.get_json() or {}
        if not d.get('description') or not d.get('amount'): return err('Description et montant requis')
        e=Expense(date=d.get('date',today()),category=d.get('category','Autre'),
                  description=d['description'],amount=float(d['amount']),
                  payment_method=d.get('paymentMethod','Cash'),notes=d.get('notes',''),
                  created_by=g.user.id)
        db.session.add(e); db.session.commit(); return ok(e.to_dict(rate()),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/expenses/<int:eid>', methods=['PUT'])
@role_required('Admin','Comptable')
def upd_expense(eid):
    try:
        e=db.session.get(Expense,eid)
        if not e: return err('Introuvable',404)
        d=request.get_json() or {}
        for f,a in [('date','date'),('category','category'),('description','description'),('paymentMethod','payment_method'),('notes','notes')]:
            if f in d: setattr(e,a,d[f])
        if 'amount' in d: e.amount=float(d['amount'])
        db.session.commit(); return ok(e.to_dict(rate()))
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/expenses/<int:eid>', methods=['DELETE'])
@role_required('Admin','Comptable')
def del_expense(eid):
    e=db.session.get(Expense,eid)
    if not e: return err('Introuvable',404)
    db.session.delete(e); db.session.commit(); return ok({'success':True})

# ══════════════════════════════════════════════════
# USERS
# ══════════════════════════════════════════════════
@app.route('/api/users')
@role_required('Admin')
def get_users():
    return ok([u.to_dict() for u in User.query.order_by(User.name).all()])

@app.route('/api/users', methods=['POST'])
@role_required('Admin')
def add_user():
    try:
        d=request.get_json() or {}
        if not d.get('name') or not d.get('email'): return err('Nom et email requis')
        if not d.get('password'): return err('Mot de passe requis')
        if len(d['password'])<6: return err('Minimum 6 caractères')
        if User.query.filter(db.func.lower(User.email)==d['email'].lower()).first(): return err('Email déjà utilisé')
        colors=['#8B5CF6','#00D9FF','#10B981','#F59E0B','#EF4444','#EC4899','#3B82F6']
        u=User(name=d['name'],email=d['email'].lower(),password=gen_hash(d['password']),
               role=d.get('role','Vendeur'),phone=d.get('phone',''),address=d.get('address',''),
               active=True,avatar_color=random.choice(colors))
        db.session.add(u); db.session.commit(); return ok(u.to_dict(),201)
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/users/<int:uid>', methods=['PUT'])
@role_required('Admin')
def upd_user(uid):
    try:
        u=db.session.get(User,uid)
        if not u: return err('Introuvable',404)
        d=request.get_json() or {}
        for f in ['name','phone','address','city']:
            if f in d: setattr(u,f,d[f])
        if 'email'  in d: u.email=d['email'].lower()
        if 'role'   in d: u.role=d['role']
        if 'active' in d: u.active=bool(d['active'])
        if d.get('password'):
            if len(d['password'])<6: return err('Minimum 6 caractères')
            u.password=gen_hash(d['password'])
        db.session.commit(); return ok(u.to_dict())
    except: traceback.print_exc(); return err('Erreur',500)

@app.route('/api/users/<int:uid>', methods=['DELETE'])
@role_required('Admin')
def del_user(uid):
    if g.user.id==uid: return err('Impossible de supprimer votre propre compte')
    u=db.session.get(User,uid)
    if not u: return err('Introuvable',404)
    db.session.delete(u); db.session.commit(); return ok({'success':True})

@app.route('/api/users/<int:uid>/reset-password', methods=['POST'])
@role_required('Admin')
def reset_pw(uid):
    u=db.session.get(User,uid)
    if not u: return err('Introuvable',404)
    tmp=gen_pw(); u.password=gen_hash(tmp); u.force_password_change=True; u.temp_password=tmp
    db.session.commit(); return ok({'success':True,'tempPassword':tmp})

@app.route('/api/users/<int:uid>/toggle-active', methods=['POST'])
@role_required('Admin')
def toggle_user(uid):
    if g.user.id==uid: return err('Impossible de modifier votre propre compte')
    u=db.session.get(User,uid)
    if not u: return err('Introuvable',404)
    u.active=not u.active; db.session.commit(); return ok({'success':True,'active':u.active})

# ══════════════════════════════════════════════════
# SETTINGS
# ══════════════════════════════════════════════════
@app.route('/api/settings')
@jwt_required()
def get_settings():
    s=Setting.query.first(); return ok(s.to_dict() if s else {})

@app.route('/api/settings', methods=['PUT'])
@role_required('Admin')
def upd_settings():
    try:
        s=Setting.query.first(); d=request.get_json() or {}
        for f,a in [('companyName','company_name'),('slogan','slogan'),('address','address'),('phone','phone'),('email','email'),('logoUrl','logo_url'),('heroText','hero_text'),('currency','currency')]:
            if f in d: setattr(s,a,d[f])
        if 'exchangeRate' in d: s.exchange_rate=float(d['exchangeRate'])
        db.session.commit(); return ok(s.to_dict())
    except: traceback.print_exc(); return err('Erreur',500)

# ══════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════
@app.route('/api/dashboard')
@jwt_required()
def dashboard():
    try:
        u=me(); now=date.today(); ym=now.strftime('%Y-%m'); r=rate()
        vendeur=u and u.role=='Vendeur'
        all_sales=(Sale.query.filter_by(created_by=u.id) if vendeur else Sale.query).order_by(Sale.date.desc()).all()
        exp_all=[] if vendeur else Expense.query.all()
        ms=[s for s in all_sales if (s.date or '').startswith(ym)]
        em=[e for e in exp_all if (e.date or '').startswith(ym)]
        rev=round(sum(s.total_usd or 0 for s in ms),2)
        pad=round(sum(s.paid_usd or 0 for s in ms),2)
        exp=round(sum(e.amount or 0 for e in em),2)
        prf=round(rev-exp,2)
        prods=Product.query.all(); n_cl=Client.query.count()
        low=[p.to_dict(r) for p in prods if (p.qty or 0)<=(p.alert_qty or 2)]
        daily=[]
        for i in range(6,-1,-1):
            d=now-timedelta(days=i); ds=d.isoformat()
            rv=round(sum(s.total_usd or 0 for s in all_sales if s.date==ds),2)
            ex=round(sum(e.amount or 0 for e in exp_all if e.date==ds),2)
            daily.append({'date':ds,'label':d.strftime('%a %d'),'revenue':rv,'expenses':ex})
        pm={}
        for s in ms: pm[s.payment_method or 'Cash']=pm.get(s.payment_method or 'Cash',0)+(s.total_usd or 0)
        monthly=[]
        for i in range(5,-1,-1):
            mo=now.month-i; yr=now.year
            while mo<=0: mo+=12; yr-=1
            ms2=f'{yr}-{mo:02d}'
            rs=round(sum(s.total_usd or 0 for s in all_sales if (s.date or '').startswith(ms2)),2)
            es=round(sum(e.amount or 0 for e in exp_all if (e.date or '').startswith(ms2)),2)
            monthly.append({'month':ms2[5:],'revenue':rs,'expenses':es,'profit':round(rs-es,2)})
        pt={}
        for s in all_sales: pt[s.product_name or 'Inconnu']=pt.get(s.product_name or 'Inconnu',0)+(s.total_usd or 0)
        top_products=sorted([{'name':k,'revenue':round(v,2)} for k,v in pt.items()],key=lambda x:-x['revenue'])[:5]
        orders_pending=Order.query.filter_by(status='pending').count() if not vendeur else 0
        return ok(dict(
            kpis=dict(revenueMois=rev,revenueMoisHTG=round(rev*r),paidMois=pad,paidMoisHTG=round(pad*r),
                      depensesMois=exp,depensesMoisHTG=round(exp*r),profit=prf,profitHTG=round(prf*r),
                      balanceDue=round(rev-pad,2),balanceDueHTG=round((rev-pad)*r),
                      totalVentes=len(all_sales),totalClients=n_cl,totalProduits=len(prods),
                      stockAlerte=len(low),stockUnites=sum(p.qty or 0 for p in prods),
                      ordersPending=orders_pending),
            dailySales=daily,monthlyTrend=monthly,
            paymentMethods=sorted([{'method':k,'amount':round(v,2),'amountHTG':round(v*r)} for k,v in pm.items()],key=lambda x:-x['amount']),
            topProducts=top_products,lowStock=low,
            recentSales=[s.to_dict(r) for s in all_sales[:8]],
            exchangeRate=r,role=u.role if u else 'Unknown'))
    except: traceback.print_exc(); return err('Erreur dashboard',500)

@app.route('/api/reports')
@role_required('Admin','Comptable')
def reports():
    try:
        r=rate(); period=request.args.get('period','month'); now=date.today()
        if period=='week': start=(now-timedelta(days=now.weekday())).isoformat(); end=now.isoformat()
        elif period=='year': start=f'{now.year}-01-01'; end=f'{now.year}-12-31'
        else: start=f'{now.year}-{now.month:02d}-01'; end=now.isoformat()
        sales=Sale.query.filter(Sale.date>=start,Sale.date<=end).all()
        exps=Expense.query.filter(Expense.date>=start,Expense.date<=end).all()
        rev=round(sum(s.total_usd or 0 for s in sales),2)
        pad=round(sum(s.paid_usd or 0 for s in sales),2)
        exp=round(sum(e.amount or 0 for e in exps),2)
        monthly=[]
        for i in range(5,-1,-1):
            mo=now.month-i; yr=now.year
            while mo<=0: mo+=12; yr-=1
            ms=f'{yr}-{mo:02d}'
            rs=round(sum(s.total_usd or 0 for s in Sale.query.filter(Sale.date.like(f'{ms}%')).all()),2)
            es=round(sum(e.amount or 0 for e in Expense.query.filter(Expense.date.like(f'{ms}%')).all()),2)
            monthly.append({'month':ms[5:],'revenue':rs,'expenses':es,'profit':round(rs-es,2)})
        cats={}
        for e in exps: cats[e.category or 'Autre']=cats.get(e.category or 'Autre',0)+(e.amount or 0)
        return ok(dict(revenue=rev,revenueHTG=round(rev*r),paid=pad,paidHTG=round(pad*r),
                       expenses=exp,expensesHTG=round(exp*r),profit=round(rev-exp,2),
                       profitHTG=round((rev-exp)*r),salesCount=len(sales),exchangeRate=r,
                       monthlyTrend=monthly,
                       expByCategory=sorted([{'cat':k,'amount':round(v,2),'amountHTG':round(v*r)} for k,v in cats.items()],key=lambda x:-x['amount'])))
    except: traceback.print_exc(); return err('Erreur',500)

# ══════════════════════════════════════════════════
# SEED
# ══════════════════════════════════════════════════
def seed():
    if User.query.count()>0: return
    print('  ✦ Seeding DEALPAM v5...')
    t=date.today(); dd=lambda n:(t-timedelta(days=n)).isoformat()
    db.session.add_all([
        User(name='Administrateur',  email='admin@dealpam.com',     password=gen_hash('admin123'), role='Admin',      avatar_color='#00D9FF'),
        User(name='Jean Vendeur',    email='vendeur@dealpam.com',   password=gen_hash('vend123'),  role='Vendeur',    avatar_color='#10B981'),
        User(name='Marie Comptable', email='comptable@dealpam.com', password=gen_hash('comp123'),  role='Comptable',  avatar_color='#EC4899'),
        User(name='Sophie Client',   email='client@dealpam.com',    password=gen_hash('client123'),role='Client',     avatar_color='#8B5CF6'),
    ]); db.session.commit()
    db.session.add_all([
        Product(sku='DP-001',name='Wonder Rose Summer EDT',   description='Parfum floral léger, idéal pour l\'été. Notes de rose, jasmin et musc blanc.',          category='Femme Florale',  qty=5,alert_qty=2,cost=17.95,price=29.90,image_url='https://images.unsplash.com/photo-1541643600914-78b084683702?w=400',featured=True),
        Product(sku='DP-002',name='#Tobacco Intense Dark EDP',description='Parfum intense masculin. Notes de tabac brun, bois de santal et ambre chaud.',           category='Homme Intense',  qty=4,alert_qty=2,cost=22.95,price=35.90,image_url='https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400',featured=True),
        Product(sku='DP-003',name='Night Pour Homme II EDP',  description='Parfum nocturne élégant. Notes boisées, épicées et musquées pour la soirée.',            category='Homme Nuit',     qty=3,alert_qty=2,cost=22.95,price=35.90,image_url='https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400'),
        Product(sku='DP-004',name='Sunrise Red Sand Dunes EDP',description='Parfum oriental exclusif. Notes de safran doré, oud précieux et rose de Damas.',        category='Oriental',       qty=1,alert_qty=2,cost=45.90,price=75.00,image_url='https://images.unsplash.com/photo-1519219788971-8d9797e0928e?w=400',featured=True),
        Product(sku='DP-005',name='Vibrant Leather EDP',      description='Parfum mixte sophistiqué. Notes de cuir noble, ambre oriental et bois de cèdre.',        category='Mixte Cuir',     qty=2,alert_qty=2,cost=19.95,price=32.90,image_url='https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
        Product(sku='DP-006',name='Vanilla Cold Caramel EDP', description='Parfum gourmand féminin irrésistible. Notes de vanille douce, caramel et musc blanc.',   category='Femme Gourmand', qty=1,alert_qty=2,cost=29.90,price=49.90,image_url='https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'),
        Product(sku='DP-007',name='Rich Warm Addictive EDT',  description='Parfum enveloppant et addictif. Notes de bois de oud, épices orientales et résine.',     category='Homme Intense',  qty=3,alert_qty=2,cost=22.95,price=35.90,image_url='https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400'),
        Product(sku='DP-008',name='Red Vanilla EDT',          description='Parfum féminin sensuel. Vanille rouge intense et captivante, fond musqué envoûtant.',     category='Femme Gourmand', qty=2,alert_qty=2,cost=17.95,price=29.90,image_url='https://images.unsplash.com/photo-1588776814546-1ffbb7d7bc28?w=400'),
    ]); db.session.commit()
    db.session.add_all([
        Client(name='Manoucheka Pierre',    phone='509-1234-5678',email='manoucheka@email.com',city='Port-au-Prince',id_type='CIN',id_number='HT-12345678',notes='Cliente VIP',user_id=4),
        Client(name='Robert Jean-Baptiste', phone='509-2345-6789',email='robert@email.com',    city='Pétion-Ville', id_type='Passeport',id_number='PA987654'),
        Client(name='Sophie Fontaine',      phone='509-3456-7890',email='sophie@email.com',    city='Delmas',       notes='Préfère MoCash'),
        Client(name='Marc-André Dupont',    phone='509-4567-8901',email='marc@email.com',       city='Jacmel'),
        Client(name='Isabelle Moreau',      phone='509-5678-9012',email='isabelle@email.com',  city='Cap-Haïtien',  notes='Commandes en gros'),
    ]); db.session.commit()
    db.session.add_all([
        Sale(date=dd(0), client_id=1,client_name='Manoucheka Pierre',    product_id=1,product_name='Wonder Rose Summer EDT',    qty=1,unit_price=29.90,total_usd=29.90, paid_usd=29.90,payment_method='Cash',          status='completed',created_by=2),
        Sale(date=dd(1), client_id=2,client_name='Robert Jean-Baptiste', product_id=2,product_name='#Tobacco Intense Dark EDP', qty=2,unit_price=35.90,total_usd=71.80, paid_usd=50.00,payment_method='MoCash',        status='completed',created_by=2),
        Sale(date=dd(2), client_id=3,client_name='Sophie Fontaine',      product_id=3,product_name='Night Pour Homme II EDP',   qty=1,unit_price=35.90,total_usd=35.90, paid_usd=35.90,payment_method='MoCash',        status='completed',created_by=2),
        Sale(date=dd(4), client_id=1,client_name='Manoucheka Pierre',    product_id=4,product_name='Sunrise Red Sand Dunes EDP',qty=1,unit_price=75.00,total_usd=75.00, paid_usd=75.00,payment_method='Virement',      status='completed',created_by=2),
        Sale(date=dd(6), client_id=4,client_name='Marc-André Dupont',    product_id=5,product_name='Vibrant Leather EDP',       qty=1,unit_price=32.90,total_usd=32.90, paid_usd=32.90,payment_method='Cash',          status='completed',created_by=2),
        Sale(date=dd(8), client_id=5,client_name='Isabelle Moreau',      product_id=6,product_name='Vanilla Cold Caramel EDP',  qty=2,unit_price=49.90,total_usd=99.80, paid_usd=99.80,payment_method='Carte bancaire',status='completed',created_by=2),
        Sale(date=dd(12),client_id=2,client_name='Robert Jean-Baptiste', product_id=7,product_name='Rich Warm Addictive EDT',   qty=1,unit_price=35.90,total_usd=35.90, paid_usd=35.90,payment_method='Cash',          status='completed',created_by=2),
        Sale(date=dd(18),client_id=3,client_name='Sophie Fontaine',      product_id=8,product_name='Red Vanilla EDT',           qty=2,unit_price=29.90,total_usd=59.80, paid_usd=59.80,payment_method='MoCash',        status='completed',created_by=2),
        Sale(date=dd(22),client_id=1,client_name='Manoucheka Pierre',    product_id=1,product_name='Wonder Rose Summer EDT',    qty=1,unit_price=29.90,total_usd=29.90, paid_usd=15.00,payment_method='Cash',          status='completed',created_by=2),
        Sale(date=dd(35),client_id=5,client_name='Isabelle Moreau',      product_id=3,product_name='Night Pour Homme II EDP',   qty=3,unit_price=35.90,total_usd=107.70,paid_usd=107.70,payment_method='Virement',     status='completed',created_by=2),
    ]); db.session.commit()
    db.session.add_all([
        Expense(date=dd(35),category='Achat Stock',description='Commande Zara — 23 bouteilles initiales',   amount=724.20,payment_method='Cash',          created_by=1),
        Expense(date=dd(30),category='Shipping',   description='Frais livraison commande initiale',         amount=45.00, payment_method='Cash',          created_by=1),
        Expense(date=dd(20),category='Marketing',  description='Publicité Facebook & Instagram — campagne', amount=30.00, payment_method='Carte bancaire', created_by=1),
        Expense(date=dd(15),category='Services',   description='Abonnement logiciel gestion',               amount=15.00, payment_method='Carte bancaire', created_by=1),
        Expense(date=dd(5), category='Achat Stock',description='Réapprovisionnement — 8 flacons',           amount=280.00,payment_method='Cash',          created_by=1),
    ]); db.session.commit()
    db.session.add(Setting(company_name='DEALPAM',slogan='Parfums d\'exception pour chaque moment',hero_text='Découvrez notre collection exclusive de parfums Zara — des fragrances uniques pour sublimer chaque instant')); db.session.commit()
    print('  ✦ DEALPAM v5 seeded!')

if __name__=='__main__':
    with app.app_context():
        db.create_all(); seed()
    print('\n  ╔══════════════════════════════════════╗')
    print('  ║     DEALPAM v5.0 — Flask API          ║')
    print('  ║  API    → http://127.0.0.1:8000       ║')
    print('  ║  Admin  → http://localhost:3000        ║')
    print('  ║  Client → http://localhost:3001        ║')
    print('  ║                                        ║')
    print('  ║  admin@dealpam.com    / admin123       ║')
    print('  ║  vendeur@dealpam.com  / vend123        ║')
    print('  ║  comptable@dealpam.com/ comp123        ║')
    print('  ║  client@dealpam.com   / client123      ║')
    print('  ╚══════════════════════════════════════╝\n')
    app.run(debug=True,port=8000,host='127.0.0.1')
