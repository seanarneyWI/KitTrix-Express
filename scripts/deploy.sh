#!/bin/bash
set -e

echo "🚀 Deploying KitTrix-Express to Digital Ocean server..."

# Configuration
SERVER="sean@137.184.182.28"
APP_DIR="~/KitTrix-Express"
DATABASE_URL="postgresql://motioadmin:M0t10n4lys1s@localhost:5432/motioPGDB"

echo "📦 Step 1: Pulling latest code from GitHub..."
ssh $SERVER "cd $APP_DIR && git pull"

echo "📚 Step 2: Installing dependencies..."
ssh $SERVER "cd $APP_DIR && source ~/.nvm/nvm.sh && npm install"

echo "🔧 Step 3: Generating Prisma client..."
ssh $SERVER "cd $APP_DIR && source ~/.nvm/nvm.sh && DATABASE_URL='$DATABASE_URL' npx prisma generate"

echo "⚠️  Step 4: Skipping 'prisma db push' (NEVER use on shared database!)"
echo "    If schema changes are needed, apply manual SQL migrations"

echo "🏗️  Step 5: Building frontend..."
ssh $SERVER "cd $APP_DIR && source ~/.nvm/nvm.sh && npm run build"

echo "🌐 Step 6: Updating nginx configuration..."
ssh $SERVER "sudo cp $APP_DIR/nginx/kits.digiglue.io /etc/nginx/sites-available/kits.digiglue.io"
ssh $SERVER "sudo nginx -t"
ssh $SERVER "sudo systemctl reload nginx"

echo "🔄 Step 7: Restarting application..."
# Kill existing processes
ssh $SERVER "pkill -f 'npm.*dev' || true"
ssh $SERVER "pkill -f 'node server/index.cjs' || true"

# Wait for processes to die
sleep 2

# Start the application in production mode
echo "▶️  Step 8: Starting KitTrix-Express in production mode..."
ssh $SERVER "cd $APP_DIR && source ~/.nvm/nvm.sh && nohup bash -c 'NODE_ENV=production PORT=3001 DATABASE_URL=\"$DATABASE_URL\" node server/index.cjs > ~/kittrix-express.log 2>&1' > /dev/null 2>&1 &"

echo "⏳ Waiting for application to start..."
sleep 5

echo "✅ Step 9: Verifying deployment..."
if curl -s -f http://137.184.182.28:3001/api/health > /dev/null; then
    echo "✅ Express server (API + Frontend) is running on port 3001"
else
    echo "❌ Express server failed to start on port 3001"
    exit 1
fi

if curl -s -f https://kits.digiglue.io > /dev/null; then
    echo "✅ Site is accessible at https://kits.digiglue.io"
else
    echo "⚠️  Site may not be accessible at https://kits.digiglue.io yet (SSL may take a moment)"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Access points:"
echo "   - Express Server (API + Frontend): http://137.184.182.28:3001"
echo "   - Production URL: https://kits.digiglue.io"
echo ""
echo "📝 Logs: ssh $SERVER 'tail -f ~/kittrix-express.log'"
echo ""
