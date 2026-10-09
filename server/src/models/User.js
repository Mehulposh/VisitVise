const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new Schema({

  name: { 
    type: String, 
    required: true, 
    trim: true 
},
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
},
  password: { 
    type: String, 
    required: true 
},
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
}
}, { 
    timestamps: { 
        createdAt: 'created', 
        updatedAt: false 
    } 
}
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
 

});


userSchema.methods.matches = function (pw) { return bcrypt.compare(pw, this.password); };
userSchema.set('toJSON', { transform: (d, r) => { r.id = String(r._id); delete r._id; delete r.__v; delete r.password; return r; } });
module.exports = model('User', userSchema);