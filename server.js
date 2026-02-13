import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Printful API config
const PRINTFUL_API = 'https://api.printful.com';
const PRINTFUL_TOKEN = process.env.PRINTFUL_TOKEN || '';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Multer config for design uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// ============================================
// Printful API Helper
// ============================================
async function printfulAPI(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${PRINTFUL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${PRINTFUL_API}${endpoint}`, opts);
  const data = await res.json();
  
  if (data.code !== 200 && data.code !== undefined) {
    throw new Error(`Printful API error: ${data.result || data.error?.message || JSON.stringify(data)}`);
  }
  return data;
}

// ============================================
// PRODUCT TEMPLATES
// These match Court Sportswear's existing products
// ============================================

const TEE_TEMPLATE = {
  product_id: 380,
  name_suffix: "Men's Performance Tee",
  retail_base: 26.95,
  retail_2xl: 29.95,
  retail_3xl: 32.95,
  variants: [
    { color: "Black", code: "#0b0b0b", ids: [10919, 10920, 10921, 10922, 10923, 10924, 10925] },
    { color: "Navy", code: "#283044", ids: [10940, 10941, 10942, 10943, 10944, 10945, 10946] },
    { color: "Forest", code: "#3b5323", ids: [10933, 10934, 10935, 10936, 10937, 10938, 10939] },
    { color: "Royal", code: "#2b3d8b", ids: [10947, 10948, 10949, 10950, 10951, 10952, 10953] },
    { color: "Graphite", code: "#5e5e5e", ids: [10926, 10927, 10928, 10929, 10930, 10931, 10932] },
    { color: "Silver", code: "#c0c0c0", ids: [10954, 10955, 10956, 10957, 10958, 10959, 10960] },
    { color: "White", code: "#ffffff", ids: [10961, 10962, 10963, 10964, 10965, 10966, 10967] },
  ]
};

const HOODIE_TEMPLATE = {
  product_id: 146,
  name_suffix: "Unisex Hoodie",
  retail_base: 36.75,
  retail_2xl: 38.75,
  retail_3xl: 38.75,
  variants: [
    { color: "Black", code: "#0b0b0b", ids: [4573, 4574, 4575, 4576, 4577, 4578] },
    { color: "Navy Blazer", code: "#283044", ids: [4597, 4598, 4599, 4600, 4601, 4602] },
    { color: "Maroon", code: "#6b1c2a", ids: [4591, 4592, 4593, 4594, 4595, 4596] },
    { color: "Charcoal Heather", code: "#555555", ids: [4579, 4580, 4581, 4582, 4583, 4584] },
    { color: "Team Royal", code: "#2b3d8b", ids: [4627, 4628, 4629, 4630, 4631, 4632] },
    { color: "Purple", code: "#5a2d82", ids: [4609, 4610, 4611, 4612, 4613, 4614] },
    { color: "Forest Green", code: "#3b5323", ids: [4585, 4586, 4587, 4588, 4589, 4590] },
    { color: "Military Green", code: "#5c6b47", ids: [4621, 4622, 4623, 4624, 4625, 4626] },
    { color: "Dusty Rose", code: "#c9928e", ids: [4633, 4634, 4635, 4636, 4637, 4638] },
    { color: "Carbon Grey", code: "#616161", ids: [4639, 4640, 4641, 4642, 4643, 4644] },
    { color: "Sky Blue", code: "#87ceeb", ids: [4615, 4616, 4617, 4618, 4619, 4620] },
    { color: "White", code: "#ffffff", ids: [4603, 4604, 4605, 4606, 4607, 4608] },
  ]
};

const HAT_TEMPLATE = {
  product_id: 527,
  name_suffix: "Trucker Cap",
  retail_base: 24.95,
  variants: [
    { color: "Black", code: "#0b0b0b", ids: [12830] },
    { color: "White/Black", code: "#ffffff", ids: [12850] },
    { color: "Navy/White", code: "#283044", ids: [12845] },
    { color: "Red/White", code: "#cc0000", ids: [12848] },
    { color: "Royal/White", code: "#2b3d8b", ids: [12849] },
  ]
};

// ============================================
// API ROUTES
// ============================================

// Health check - use /store/products instead of /store (doesn't need stores_list/read scope)
app.get('/api/status', async (req, res) => {
  try {
    if (!PRINTFUL_TOKEN) {
      return res.json({ ok: false, error: 'PRINTFUL_TOKEN not set' });
    }
    // Use store/products endpoint which only needs product read scope
    const data = await printfulAPI('/store/products');
    const productCount = (data.result || []).length;
    res.json({ ok: true, store: { name: 'Court Sportswear', products: productCount } });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const data = await printfulAPI('/store/products');
    res.json({ ok: true, products: data.result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/catalog/:productId', async (req, res) => {
  try {
    const data = await printfulAPI(`/products/${req.params.productId}`);
    res.json({ ok: true, product: data.result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/api/upload', upload.array('designs', 30), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ ok: false, error: 'No files uploaded' });
  }
  
  const files = req.files.map(f => ({
    id: f.filename,
    originalName: f.originalname,
    path: `/uploads/${f.filename}`,
    size: f.size,
    designName: f.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  }));
  
  res.json({ ok: true, files });
});

async function uploadToPrintful(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  const result = await printfulAPI('/files', 'POST', {
    type: 'default',
    url: `data:${mimeType};base64,${base64}`
  });
  
  return result.result;
}

async function createPrintfulProduct(designName, printfulFileId, fileUrl, template) {
  const productName = `${designName} \u2014 ${template.name_suffix}`;
  
  const syncVariants = [];
  for (const colorGroup of template.variants) {
    for (let i = 0; i < colorGroup.ids.length; i++) {
      const variantId = colorGroup.ids[i];
      let retailPrice = template.retail_base;
      
      if (i >= 4 && template.retail_2xl) retailPrice = template.retail_2xl;
      if (i >= 5 && template.retail_3xl) retailPrice = template.retail_3xl;
      
      syncVariants.push({
        variant_id: variantId,
        retail_price: retailPrice.toFixed(2),
        files: [
          {
            type: 'default',
            id: printfulFileId,
            url: fileUrl
          }
        ]
      });
    }
  }
  
  const payload = {
    sync_product: {
      name: productName,
      thumbnail: fileUrl
    },
    sync_variants: syncVariants
  };
  
  const result = await printfulAPI('/store/products', 'POST', payload);
  return result.result;
}

app.post('/api/bulk-create', async (req, res) => {
  const { designs, productTypes } = req.body;
  
  if (!designs || designs.length === 0) {
    return res.status(400).json({ ok: false, error: 'No designs provided' });
  }
  
  const templates = {
    tee: TEE_TEMPLATE,
    hoodie: HOODIE_TEMPLATE,
    hat: HAT_TEMPLATE
  };
  
  const results = [];
  const errors = [];
  
  for (const design of designs) {
    const localPath = path.join(uploadsDir, design.fileId);
    
    if (!fs.existsSync(localPath)) {
      errors.push({ design: design.designName, error: 'File not found' });
      continue;
    }
    
    let printfulFile;
    try {
      printfulFile = await uploadToPrintful(localPath, design.fileId);
    } catch (err) {
      errors.push({ design: design.designName, error: `Upload failed: ${err.message}` });
      continue;
    }
    
    for (const type of (productTypes || ['tee', 'hoodie', 'hat'])) {
      const template = templates[type];
      if (!template) continue;
      
      try {
        const product = await createPrintfulProduct(
          design.designName,
          printfulFile.id,
          printfulFile.preview_url || printfulFile.url,
          template
        );
        results.push({
          design: design.designName,
          type,
          productId: product.id,
          name: `${design.designName} \u2014 ${template.name_suffix}`,
          status: 'created'
        });
      } catch (err) {
        errors.push({
          design: design.designName,
          type,
          error: err.message
        });
      }
      
      await new Promise(r => setTimeout(r, 600));
    }
  }
  
  res.json({ ok: true, results, errors, summary: { created: results.length, failed: errors.length } });
});

app.get('/api/detect-templates', async (req, res) => {
  try {
    const data = await printfulAPI('/store/products');
    const products = data.result || [];
    
    const detected = [];
    for (const p of products.slice(0, 5)) {
      try {
        const detail = await printfulAPI(`/store/products/${p.id}`);
        const syncProduct = detail.result.sync_product;
        const syncVariants = detail.result.sync_variants || [];
        
        if (syncVariants.length > 0) {
          const firstVariant = syncVariants[0];
          detected.push({
            name: syncProduct.name,
            printfulProductId: firstVariant.product?.product_id,
            variantCount: syncVariants.length,
            sampleVariantId: firstVariant.variant_id,
            retailPrice: firstVariant.retail_price
          });
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {}
    }
    
    res.json({ ok: true, detected });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.delete('/api/upload/:fileId', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.fileId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return res.json({ ok: true });
  }
  res.status(404).json({ ok: false, error: 'File not found' });
});

app.get('/api/uploads', (req, res) => {
  const files = fs.readdirSync(uploadsDir).map(f => ({
    id: f,
    path: `/uploads/${f}`,
    designName: f.replace(/^\d+-/, '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  }));
  res.json({ ok: true, files });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n\ud83c\udfa8 PrintFlow running on port ${PORT}`);
  console.log(`   Token: ${PRINTFUL_TOKEN ? '\u2713 Set' : '\u2717 Missing \u2014 set PRINTFUL_TOKEN env var'}`);
});
